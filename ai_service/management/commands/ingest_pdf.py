import os
import re
import time

import fitz  # PyMuPDF
from django.conf import settings
from django.core.management.base import BaseCommand
from google import genai
from google.genai import types

from ai_service.models import LegalDocumentEmbedding


class Command(BaseCommand):
    help = (
        "Batch parses a folder of 2-column bilingual legal PDFs, "
        "chunks by Article, and embeds into pgvector."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder',
            type=str,
            default='proclamations',
            help='Folder name in the project root containing the PDFs'
        )

    def chunk_by_article(self, text: str) -> list[str]:
        """
        Splits text semantically by identifying Articles or numbered list items,
        accounting for both English and Amharic numeral prefixes.
        """
        text = re.sub(r'\n+', '\n', text)

        # Regex captures:
        # 1. "Article", "ARTICLE", or "አንቀጽ" followed by digits or Ethiopic numerals
        # 2. English numbered lists (e.g., "1. ")
        # 3. Amharic numbered lists (e.g., "፩ ")
        pattern = (
            r'\n(?=(?:Article|ARTICLE|አንቀጽ)\s*(?:\d+|[፩-፼]+)|'
            r'\d+\.\s+[A-Z]|[፩-፼]+\s+[\u1200-\u137F])'
        )

        raw_chunks = re.split(pattern, text)
        final_chunks = []

        for chunk in raw_chunks:
            clean_chunk = chunk.strip()

            # Ignore extremely small, fragmented chunks
            if len(clean_chunk) < 50:
                continue

            # Fallback for massive chunks (like a long preamble) to prevent API token limits
            if len(clean_chunk) > 3000:
                start = 0
                overlap = 200
                chunk_size = 1500
                while start < len(clean_chunk):
                    end = start + chunk_size
                    final_chunks.append(clean_chunk[start:end].strip())
                    start += (chunk_size - overlap)
            else:
                final_chunks.append(clean_chunk)

        return final_chunks

    def extract_bilingual_columns(self, pdf_path: str) -> tuple[str, str]:
        """
        Extracts text word-by-word based on the exact horizontal position
        of each word, guaranteeing no cross-column merging.
        """
        doc = fitz.open(pdf_path)
        amharic_lines = []
        english_lines = []

        for page in doc:
            page_center = page.rect.width / 2
            dict_amharic = {}
            dict_english = {}

            words = page.get_text("words")
            for w in words:
                x0, _, x1, _, text, block_no, line_no, _ = w
                word_center = (x0 + x1) / 2
                key = (block_no, line_no)

                if word_center < page_center:
                    if key not in dict_amharic:
                        dict_amharic[key] = []
                    dict_amharic[key].append(text)
                else:
                    if key not in dict_english:
                        dict_english[key] = []
                    dict_english[key].append(text)

            for key in sorted(dict_amharic.keys()):
                amharic_lines.append(" ".join(dict_amharic[key]))
            for key in sorted(dict_english.keys()):
                english_lines.append(" ".join(dict_english[key]))

        return "\n".join(amharic_lines), "\n".join(english_lines)

    def handle(self, *args, **kwargs):
        folder_name = kwargs['folder']
        target_dir = os.path.join(settings.BASE_DIR, folder_name)

        if not os.path.exists(target_dir):
            self.stderr.write(self.style.ERROR(f"Directory not found: {target_dir}"))
            return

        pdf_files = [f for f in os.listdir(target_dir) if f.lower().endswith('.pdf')]

        if not pdf_files:
            self.stdout.write(self.style.WARNING(f"No PDFs found in {target_dir}"))
            return

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            self.stderr.write(
                self.style.ERROR("GEMINI_API_KEY missing from environment variables.")
            )
            return

        # Initialize the modern GenAI Client
        client = genai.Client(api_key=api_key)
        # The correct, active Gemini embedding model
        embedding_model = "gemini-embedding-001"

        self.stdout.write(
            self.style.SUCCESS(f"Found {len(pdf_files)} PDF(s). Starting batch ingestion...")
        )

        for filename in pdf_files:
            pdf_path = os.path.join(target_dir, filename)
            doc_ref = os.path.splitext(filename)[0]

            self.stdout.write(f"\nProcessing: {filename}...")

            amharic_text, english_text = self.extract_bilingual_columns(pdf_path)

            amharic_chunks = self.chunk_by_article(amharic_text)
            english_chunks = self.chunk_by_article(english_text)

            all_chunks = []
            for chunk in amharic_chunks:
                all_chunks.append((chunk, f"{doc_ref} (Amharic)"))
            for chunk in english_chunks:
                all_chunks.append((chunk, f"{doc_ref} (English)"))

            self.stdout.write(f"Generated {len(all_chunks)} semantic chunks. Embedding...")

            # 4. Generate Embeddings & Save to pgvector (Batched with Backoff)
            batch_size = 100  # API limit for batching embeddings
            saved_count = 0

            # Loop through chunks in batches of 100
            for i in range(0, len(all_chunks), batch_size):
                batch = all_chunks[i:i + batch_size]

                # Prepare the list of strings for the batch API request
                texts_to_embed = [
                    " ".join(chunk[0].split()) for chunk in batch if len(chunk[0].strip()) >= 40
                ]

                if not texts_to_embed:
                    continue

                max_retries = 6
                for attempt in range(max_retries):
                    try:
                        # By passing a list of strings, the SDK automatically batches them
                        result = client.models.embed_content(
                            model=embedding_model,
                            contents=texts_to_embed,
                            config=types.EmbedContentConfig(
                                task_type="RETRIEVAL_DOCUMENT",
                                output_dimensionality=768
                            )
                        )

                        # Save the batched vectors to the database
                        for j, embedding_obj in enumerate(result.embeddings):
                            chunk_text = texts_to_embed[j]
                            # Retrieve the original chunk_ref from the batch list
                            chunk_ref = batch[j][1]

                            LegalDocumentEmbedding.objects.create(
                                doc_reference=chunk_ref,
                                content_chunk=chunk_text,
                                embedding=embedding_obj.values
                            )
                            saved_count += 1

                        # Success! Break out of the retry loop and move to the next batch
                        break

                    except Exception as e:
                        error_msg = str(e).lower()
                        if "429" in error_msg or "resource_exhausted" in error_msg:
                            # Exponential backoff: 1, 2, 4, 8, 16, 32 seconds
                            wait_time = 2 ** attempt
                            self.stdout.write(
                                self.style.WARNING(
                                    f"Rate limited (429). Retrying batch in {wait_time}s..."
                                )
                            )
                            time.sleep(wait_time)
                        else:
                            self.stderr.write(self.style.ERROR(f"Failed batch processing: {e}"))
                            break # Break on non-429 errors (like 400 Bad Request)

                if saved_count % 100 == 0 and saved_count > 0:
                    self.stdout.write(f"Ingested {saved_count}/{len(all_chunks)} chunks...")

            self.stdout.write(
                self.style.SUCCESS(f"Finished {filename}: Ingested {saved_count} chunks.")
            )

        self.stdout.write(self.style.SUCCESS("\nBatch processing complete!"))
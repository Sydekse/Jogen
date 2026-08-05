import os
import time
import fitz  # PyMuPDF
from django.core.management.base import BaseCommand
from google import genai
from google.genai import types

from ai_service.models import LegalDocumentEmbedding


class Command(BaseCommand):
    help = "Parses 2-column bilingual legal PDFs word-by-word, chunks them, and embeds into pgvector."

    def add_arguments(self, parser):
        parser.add_argument('pdf_path', type=str, help='Path to the PDF file')
        parser.add_argument('--doc_ref', type=str, help='Document reference name')

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
        """Splits text into overlapping chunks."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += (chunk_size - overlap)
        return chunks

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

            # get_text("words") returns: (x0, y0, x1, y1, "word", block_no, line_no, word_no)
            words = page.get_text("words")

            for w in words:
                x0, y0, x1, y1, text, block_no, line_no, word_no = w

                # Check where the horizontal center of the word falls
                word_center = (x0 + x1) / 2

                # Group words by their block and line numbers to preserve sentence structure
                key = (block_no, line_no)

                if word_center < page_center:
                    if key not in dict_amharic:
                        dict_amharic[key] = []
                    dict_amharic[key].append(text)
                else:
                    if key not in dict_english:
                        dict_english[key] = []
                    dict_english[key].append(text)

            # Reconstruct the sentences line-by-line in the correct reading order
            for key in sorted(dict_amharic.keys()):
                amharic_lines.append(" ".join(dict_amharic[key]))

            for key in sorted(dict_english.keys()):
                english_lines.append(" ".join(dict_english[key]))

        return "\n".join(amharic_lines), "\n".join(english_lines)

    def handle(self, *args, **kwargs):
        pdf_path = kwargs['pdf_path']
        doc_ref = kwargs.get('doc_ref') or os.path.basename(pdf_path)

        if not os.path.exists(pdf_path):
            self.stderr.write(self.style.ERROR(f"File not found: {pdf_path}"))
            return

        self.stdout.write(f"Reading two-column PDF: {pdf_path}...")

        # 1. Extract separated text streams
        amharic_text, english_text = self.extract_bilingual_columns(pdf_path)

        # 2. Chunk both languages
        amharic_chunks = self.chunk_text(amharic_text)
        english_chunks = self.chunk_text(english_text)

        all_chunks = []
        # Store metadata along with chunk text
        for chunk in amharic_chunks:
            all_chunks.append((chunk, f"{doc_ref} (Amharic)"))
        for chunk in english_chunks:
            all_chunks.append((chunk, f"{doc_ref} (English)"))

        self.stdout.write(
            f"Extracted {len(amharic_chunks)} Amharic chunks and {len(english_chunks)} English chunks."
        )

        # 3. Initialize Gemini Client
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            self.stderr.write(self.style.ERROR("GEMINI_API_KEY missing."))
            return

        client = genai.Client(api_key=api_key)
        embedding_model = "models/gemini-embedding-001"

        # 4. Generate Embeddings & Save to pgvector
        saved_count = 0
        for i, (chunk, chunk_ref) in enumerate(all_chunks):
            clean_chunk = " ".join(chunk.split())
            if len(clean_chunk) < 40:
                continue

            try:
                # Delay to prevent 429 RESOURCE_EXHAUSTED rate limit errors
                time.sleep(2)

                result = client.models.embed_content(
                    model=embedding_model,
                    contents=clean_chunk,
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_DOCUMENT",
                        output_dimensionality=768
                    )
                )

                vector = result.embeddings[0].values

                LegalDocumentEmbedding.objects.create(
                    doc_reference=chunk_ref,
                    content_chunk=clean_chunk,
                    embedding=vector
                )
                saved_count += 1

                if saved_count % 10 == 0:
                    self.stdout.write(f"Ingested {saved_count}/{len(all_chunks)} chunks...")

            except Exception as e:
                self.stderr.write(self.style.WARNING(f"Failed to embed chunk {i}: {e}"))

        self.stdout.write(
            self.style.SUCCESS(f"Successfully ingested {saved_count} perfectly separated chunks for '{doc_ref}'!")
        )
import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Config
TARGET_URL = "https://justice.gov.et/am/laws/proclamations/"
OUTPUT_DIR = "./downloaded_laws"
MAX_RETRIES = 3

# Extended headers including Referer to avoid server blocks
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": TARGET_URL,
    "Accept-Language": "en-US,en;q=0.9,am;q=0.8",
}

def download_file_with_retry(full_url, filepath):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # 10s connect timeout, 120s read timeout for slow downloads
            with requests.get(full_url, headers=HEADERS, stream=True, timeout=(10, 120)) as pdf_res:
                pdf_res.raise_for_status()
                with open(filepath, "wb") as f:
                    for chunk in pdf_res.iter_content(chunk_size=16384):
                        if chunk:
                            f.write(chunk)
            print(f"✓ Saved: {os.path.basename(filepath)}")
            return True
        except (requests.exceptions.RequestException, requests.exceptions.Timeout) as e:
            print(f"  ⚠ Attempt {attempt}/{MAX_RETRIES} failed for {full_url}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(3) # Wait 3 seconds before retrying
            else:
                print(f"✗ Skipping file after {MAX_RETRIES} failed attempts.")
                return False

def download_proclamations():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Fetching page structure from {TARGET_URL}...")

    session = requests.Session()
    try:
        response = session.get(TARGET_URL, headers=HEADERS, timeout=(10, 30))
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to load portal page: {e}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    links = soup.find_all("a", href=True)
    download_count = 0

    for link in links:
        href = link["href"]
        text = link.get_text(strip=True)

        # Catch download endpoints
        if "ያውርዱ" in text or "jet_download=" in href or href.endswith(".pdf"):
            full_url = urljoin(TARGET_URL, href)

            # Use query hash or standard index for filenames
            filename = f"proclamation_{download_count + 1}.pdf"
            filepath = os.path.join(OUTPUT_DIR, filename)

            if os.path.exists(filepath):
                print(f"Skipping existing file: {filename}")
                download_count += 1
                continue

            print(f"Downloading [{download_count + 1}]: {full_url}")
            success = download_file_with_retry(full_url, filepath)
            if success:
                download_count += 1

            # Small delay to avoid overloading the target server
            time.sleep(1)

    print(f"\nCompleted! Downloaded {download_count} documents to '{OUTPUT_DIR}'.")

if __name__ == "__main__":
    download_proclamations()
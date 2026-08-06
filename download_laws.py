#!/usr/bin/env python3
import os
import re
import time
import csv
from urllib.parse import urlparse, parse_qs
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
from curl_cffi import requests

BASE_URL = "https://justice.gov.et/en/laws/proclamations/"
TOTAL_PAGES = 68
OUTPUT_DIR = "proclamations"
DELAY_SECONDS = 1.0

def find_download_links(soup):
    results = []
    for a in soup.select('a.jet-download[href], a[href*="jet_download="]'):
        href = a.get("href", "").strip()
        if "jet_download=" not in href:
            continue

        title = None
        card = a.find_parent("div", class_="jet-listing-grid__item")
        if not card:
            continue

        # 1. Extract the Title
        h6 = card.select_one("h6.elementor-heading-title a")
        h5 = card.select_one("h5.elementor-heading-title a")
        if h6 and h6.get_text(strip=True):
            title = h6.get_text(strip=True)
        elif h5 and h5.get_text(strip=True):
            title = h5.get_text(strip=True)

        # 2. Extract the Metadata/Status
        status_tags = []
        # JetEngine usually puts categories/statuses in these specific classes
        meta_elements = card.select('.jet-listing-dynamic-field__content, .jet-listing-dynamic-terms__link, .elementor-post-info__terms-list-item')

        for el in meta_elements:
            text = el.get_text(strip=True)
            # Ignore empty strings, the title itself, or the word 'Download'
            if text and text != title and text.lower() != "download":
                status_tags.append(text)

        # Fallback: If classes change, do a raw text search for common legal statuses
        if not status_tags:
            raw_text = card.get_text(separator=" ", strip=True).lower()
            if "outdated" in raw_text or "repealed" in raw_text:
                status_tags.append("Outdated")
            elif "amended" in raw_text:
                status_tags.append("Amended")
            elif "in force" in raw_text or "active" in raw_text or "still used" in raw_text:
                status_tags.append("Active")

        # Join multiple tags together (e.g., "Proclamation | Outdated")
        status = " | ".join(status_tags) if status_tags else "Unknown Status"

        results.append((title, href, status))

    return results

def safe_filename(title, url):
    qs = parse_qs(urlparse(url).query)
    doc_hash = qs.get("jet_download", ["unknown"])[0][:16]
    if title:
        slug = re.sub(r"[^A-Za-z0-9]+", "-", title).strip("-").lower()
        slug = slug[:80]
        return f"{slug}-{doc_hash}.pdf"
    return f"{doc_hash}.pdf"

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    seen_pdfs = set()

    # --- Setup CSV Logging ---
    csv_path = os.path.join(OUTPUT_DIR, "metadata.csv")
    csv_exists = os.path.exists(csv_path)
    csv_file = open(csv_path, "a", newline="", encoding="utf-8")
    csv_writer = csv.writer(csv_file)

    if not csv_exists:
        # Write the header row if this is a brand new file
        csv_writer.writerow(["Filename", "Title", "Status", "URL"])

    print("Launching Undetected-Chromedriver to bypass Cloudflare...")
    options = uc.ChromeOptions()
    # Using version_main=150 as we discovered earlier!
    driver = uc.Chrome(options=options, version_main=150)

    driver.get("https://justice.gov.et/en/")
    print("Waiting for Cloudflare to clear... (IF YOU SEE A CHECKBOX, CLICK IT!)")

    cleared = False
    for _ in range(60):
        if "Just a moment" not in driver.title and "Cloudflare" not in driver.title:
            cleared = True
            break
        time.sleep(1)

    if not cleared:
        print("[error] Failed to clear Cloudflare. Exiting.")
        driver.quit()
        return

    print(f"[success] Cloudflare cleared! Title: {driver.title}")

    print("Extracting cookies and transferring to background downloader...")
    selenium_cookies = driver.get_cookies()
    user_agent = driver.execute_script("return navigator.userAgent;")
    driver.quit()

    session = requests.Session(impersonate="chrome")
    session.headers.update({
        "User-Agent": user_agent,
        "Referer": "https://justice.gov.et/en/"
    })
    for cookie in selenium_cookies:
        session.cookies.set(cookie['name'], cookie['value'], domain=cookie['domain'])

    for page_num in range(47, TOTAL_PAGES + 1):
        url = f"{BASE_URL}?jsf=jet-engine&pagenum={page_num}" if page_num > 1 else BASE_URL
        print(f"\n=== Page {page_num}/{TOTAL_PAGES}: {url} ===")

        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 403:
                print("  [error] Session expired or blocked. Cloudflare caught us.")
                break
        except Exception as e:
            print(f"  [error] failed to load page: {e}")
            continue

        soup = BeautifulSoup(resp.content, "html.parser")
        links = find_download_links(soup)
        print(f"Found {len(links)} links on this page.")

        # Notice we now unpack 3 variables: title, pdf_url, AND status
        for title, pdf_url, status in links:
            if pdf_url in seen_pdfs:
                continue
            seen_pdfs.add(pdf_url)

            filename = safe_filename(title, pdf_url)
            path = os.path.join(OUTPUT_DIR, filename)

            if os.path.exists(path):
                print(f"  [skip] already downloaded: {filename} ({status})")
                continue

            print(f"Downloading: {title or '(untitled)'} | Status: {status}")
            try:
                pdf_resp = session.get(pdf_url, allow_redirects=True, timeout=30)
                if pdf_resp.status_code == 200:
                    with open(path, "wb") as f:
                        f.write(pdf_resp.content)
                    print(f"  [ok] {filename}")

                    # Successfully downloaded! Log it to the CSV spreadsheet.
                    csv_writer.writerow([filename, title, status, pdf_url])
                    csv_file.flush() # Ensure it saves to disk immediately

                else:
                    print(f"  [error] HTTP {pdf_resp.status_code}")
            except Exception as e:
                print(f"  [error] failed to download {pdf_url}: {e}")

            time.sleep(DELAY_SECONDS)

    # Cleanup
    csv_file.close()

if __name__ == "__main__":
    main()
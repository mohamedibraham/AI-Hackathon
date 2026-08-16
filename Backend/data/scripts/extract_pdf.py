import json
import re
from collections import Counter
from pathlib import Path

import pymupdf as fitz  

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "raw_pdfs"
OUT_DIR = BASE_DIR / "extracted"
SOURCES_FILE = BASE_DIR / "sources.json"


def load_sources():
    with open(SOURCES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_pages(pdf_path: Path):
    doc = fitz.open(pdf_path)
    pages = []
    for i, page in enumerate(doc, start=1):
        text = page.get_text("text")
        pages.append((i, text))
    doc.close()
    return pages


def detect_repeated_lines(pages, min_ratio=0.4, min_len=3):
    
    line_counts = Counter()
    total_pages = len(pages)
    for _, text in pages:
        seen_this_page = set()
        for line in text.split("\n"):
            norm = re.sub(r"\s+", " ", line).strip()
            if len(norm) >= min_len:
                seen_this_page.add(norm)
        for norm in seen_this_page:
            line_counts[norm] += 1

    repeated = {
        line for line, count in line_counts.items()
        if count / total_pages >= min_ratio
    }
    return repeated


PAGINATION_PATTERN = re.compile(
    r"^(page\s+)?\d+\s+of\s+\d*$|^page\s+\d+\s+of$", re.IGNORECASE
)


def clean_page_text(text: str, repeated_lines: set) -> str:
    cleaned_lines = []
    for line in text.split("\n"):
        norm = re.sub(r"\s+", " ", line).strip()
        if norm in repeated_lines:
            continue 
        if re.fullmatch(r"\d+", norm):
            continue  
        if PAGINATION_PATTERN.match(norm):
            continue  
        cleaned_lines.append(line)

    cleaned = "\n".join(cleaned_lines)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)          
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)    
    return cleaned    


def process_document(source: dict):
    pdf_path = RAW_DIR / source["filename"]
    if not pdf_path.exists():
        print(f"[skip] {source['filename']} not found in {RAW_DIR}")
        return None

    print(f"[processing] {source['document_name']} ({pdf_path.name})")
    pages = extract_pages(pdf_path)
    repeated_lines = detect_repeated_lines(pages)

    records = []
    for page_number, raw_text in pages:
        cleaned = clean_page_text(raw_text, repeated_lines)
        if not cleaned:
            continue  
        records.append({
            "document_name": source["document_name"],
            "source_url": source["source_url"],
            "page_number": page_number,
            "text": cleaned,
        })

    out_path = OUT_DIR / (pdf_path.stem + ".json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"  -> {len(records)} pages extracted -> {out_path.relative_to(BASE_DIR)}")
    print(f"  -> stripped {len(repeated_lines)} repeated header/footer lines")
    return out_path


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = load_sources()
    processed = [process_document(s) for s in sources]
    processed = [p for p in processed if p]
    print(f"\nDone. {len(processed)}/{len(sources)} documents processed.")


if __name__ == "__main__":
    main()
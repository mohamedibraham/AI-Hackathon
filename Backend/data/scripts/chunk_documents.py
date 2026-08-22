import json
import re
import hashlib

from helpers.config import get_settings

settings = get_settings()

BASE_DIR = settings.BASE_DIR
EXTRACTED_DIR = settings.EXTRACTED_DIR
CHUNKS_DIR = settings.CHUNKS_FILE.parent
SOURCES_FILE = settings.DATA_DIR / "sources.json"

MIN_TOKENS = 400
MAX_TOKENS = 800
TARGET_TOKENS = 600
MERGE_FLOOR = 250

try:
    import tiktoken
    _ENC = tiktoken.get_encoding("cl100k_base")

    def count_tokens(text: str) -> int:
        return len(_ENC.encode(text))
except Exception:
    def count_tokens(text: str) -> int:
        return int(len(text.split()) * 1.3)


FRONT_MATTER_MARKERS = [
    "isbn", "all rights reserved", "some rights reserved", "creative commons",
    "cataloguing-in-publication", "suggested citation", "cip data",
    "licence:", "table of contents",
]

BARE_NUMERAL_LINE = re.compile(
    r"^(\d{1,4}(\.\d{1,4}){0,4}\.?|[ivxlcdm]{1,6})$", re.IGNORECASE
)


def looks_like_toc_page(text: str) -> bool:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if len(lines) < 5:
        return False
    bare_numeral_count = sum(1 for l in lines if BARE_NUMERAL_LINE.match(l))
    return (bare_numeral_count / len(lines)) >= 0.25


def is_probable_front_matter(text: str) -> bool:
    lowered = text.lower()
    if any(marker in lowered for marker in FRONT_MATTER_MARKERS):
        return True
    if looks_like_toc_page(text):
        return True
    return False


def load_content_overrides():
    overrides = {}
    if not SOURCES_FILE.exists():
        return overrides
    with open(SOURCES_FILE, "r", encoding="utf-8") as f:
        sources = json.load(f)
    for s in sources:
        start = s.get("content_start_page")
        end = s.get("content_end_page")
        if start or end:
            overrides[s["document_name"]] = (start, end)
    return overrides


def filter_front_matter(records: list, document_name: str, overrides: dict) -> list:
    if not records:
        return records

    start, end = overrides.get(document_name, (None, None))
    if start or end:
        filtered = [
            r for r in records
            if (start is None or r["page_number"] >= start)
            and (end is None or r["page_number"] <= end)
        ]
        skipped = len(records) - len(filtered)
        if skipped:
            print(f"  [{document_name}] manual override: skipped {skipped} page(s) "
                  f"outside {start or 1}-{end or 'end'}")
        return filtered

    filtered = []
    skipped_pages = []
    for r in records:
        if is_probable_front_matter(r["text"]):
            skipped_pages.append(r["page_number"])
        else:
            filtered.append(r)
    if skipped_pages:
        print(f"  [{document_name}] auto-detected likely front-matter pages, "
              f"skipped {skipped_pages} -- REVIEW THIS. If wrong, set "
              f"content_start_page in sources.json to override.")
    return filtered


def hard_split_by_tokens(text: str, limit: int) -> list:
    """Word-level split that re-checks the real token count of the
    growing candidate string each time (rather than summing rough
    per-word estimates), so it stays correct under both the tiktoken
    path and the word-count fallback path."""
    words = text.split()
    if not words:
        return []
    pieces = []
    current = []
    for w in words:
        candidate = current + [w]
        if current and count_tokens(" ".join(candidate)) > limit:
            pieces.append(" ".join(current))
            current = [w]
        else:
            current = candidate
    if current:
        pieces.append(" ".join(current))
    return pieces


def split_oversized(text: str, limit: int) -> list:
    sentences = re.split(r"(?<=[.!?\u061F])\s+", text)
    pieces = []
    for sent in sentences:
        if count_tokens(sent) <= limit:
            pieces.append(sent)
            continue
        lines = [l for l in sent.split("\n") if l.strip()]
        if len(lines) > 1:
            for line in lines:
                if count_tokens(line) <= limit:
                    pieces.append(line)
                else:
                    pieces.extend(hard_split_by_tokens(line, limit))
        else:
            pieces.extend(hard_split_by_tokens(sent, limit))
    return pieces


REC_NUMBER_CLUSTER = re.compile(r"(?:^|\n)((?:[ \t]*\d+(?:\.\d+){1,4}\.?[ \t]*\n){2,})")
REC_END_MARKER = re.compile(r"\[\d{4}(?:,\s*(?:amended|updated)\s*\d{4})?\]")


def reattach_recommendation_ids(text: str):
    """Returns (new_text, list_of_recommendation_ids_reattached)."""
    ids_found = []
    result = []
    pos = 0

    for m in REC_NUMBER_CLUSTER.finditer(text):
        if m.start() < pos:
            continue
        result.append(text[pos:m.start()])

        ids = [x.strip() for x in m.group(1).strip().split("\n") if x.strip()]
        cursor = m.end()
        segments = []
        ok = True
        for _ in ids:
            marker_m = REC_END_MARKER.search(text, cursor)
            if not marker_m:
                ok = False
                break
            segments.append(text[cursor:marker_m.end()])
            cursor = marker_m.end()

        if ok and len(segments) == len(ids):
            for rid, seg in zip(ids, segments):
                clean_seg = re.sub(r"[ \t]+", " ", seg).strip()
                clean_seg = re.sub(r"\s*\n\s*", " ", clean_seg)
                result.append(f"\n\n[{rid}] {clean_seg}")
                ids_found.append(rid)
            pos = cursor
        else:
            result.append(m.group(1))
            pos = m.end()

    result.append(text[pos:])
    return "".join(result), ids_found


REC_ID_PREFIX = re.compile(r"^\[(\d+(?:\.\d+){1,4})\]\s*")


NUMBERED_HEADING = re.compile(r"^\d+(\.\d+)*\.?\s+[A-Z\u0600-\u06FF].{2,80}$")
ALLCAPS_HEADING = re.compile(r"^[A-Z][A-Z\s\d:,\-]{3,60}$")
TITLECASE_HEADING = re.compile(r"^[A-Z][a-zA-Z\s\d:,\-]{3,70}$")


def looks_like_heading(line: str) -> bool:
    line = line.strip()
    if not line or len(line) > 90:
        return False
    if line.endswith((".", ",", ";")):
        return False
    word_count = len(line.split())
    if word_count > 12:
        return False
    if NUMBERED_HEADING.match(line):
        return True
    if ALLCAPS_HEADING.match(line) and word_count >= 2:
        return True
    if TITLECASE_HEADING.match(line) and word_count <= 8:
        words = line.split()
        capitalized = sum(1 for w in words if w[:1].isupper())
        if capitalized / len(words) >= 0.6:
            return True
    return False


def split_into_paragraphs(page_text: str):
    """Return list of (is_heading, text) blocks in reading order."""
    blocks = []
    for raw_para in re.split(r"\n\s*\n", page_text.strip()):
        raw_para = raw_para.strip()
        if not raw_para:
            continue
        lines = raw_para.split("\n")
        if len(lines) == 1 and looks_like_heading(lines[0]):
            blocks.append((True, lines[0].strip()))
            continue
        if looks_like_heading(lines[0]) and len(lines) > 1:
            blocks.append((True, lines[0].strip()))
            rest = "\n".join(lines[1:]).strip()
            if rest:
                blocks.append((False, rest))
            continue
        blocks.append((False, raw_para))
    return blocks


def make_chunk_id(document_name: str, page_start: int, index: int) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", document_name.lower()).strip("-")[:40]
    raw = f"{document_name}-{page_start}-{index}"
    short_hash = hashlib.md5(raw.encode("utf-8")).hexdigest()[:6]
    return f"{slug}_p{page_start}_c{index}_{short_hash}"


def chunk_document(records: list) -> list:
    """records: list of page-level dicts for ONE document, in page order."""
    if not records:
        return []

    document_name = records[0]["document_name"]
    source_url = records[0]["source_url"]

    chunks = []
    chunk_index = 0

    current_section = None       
    buffer_section = None        
    buffer_parts = []
    buffer_tokens = 0
    buffer_page_start = None
    buffer_page_end = None
    buffer_rec_ids = []

    def flush():
        nonlocal buffer_parts, buffer_tokens, buffer_page_start, buffer_page_end
        nonlocal chunk_index, buffer_rec_ids, buffer_section
        if not buffer_parts:
            return
        text = "\n\n".join(buffer_parts).strip()
        if text:
            chunk_index += 1
            chunks.append({
                "chunk_id": make_chunk_id(document_name, buffer_page_start, chunk_index),
                "document_name": document_name,
                "source_url": source_url,
                "section_title": buffer_section,
                "page_start": buffer_page_start,
                "page_end": buffer_page_end,
                "page_number": buffer_page_start,
                "recommendation_ids": list(dict.fromkeys(buffer_rec_ids)),
                "token_count": count_tokens(text),
                "text": text,
            })
        buffer_parts = []
        buffer_tokens = 0
        buffer_page_start = None
        buffer_page_end = None
        buffer_rec_ids = []
        buffer_section = None

    def touch_buffer_start(page_number):
        nonlocal buffer_page_start, buffer_page_end, buffer_section
        if buffer_page_start is None:
            buffer_page_start = page_number
            buffer_section = current_section
        buffer_page_end = page_number

    for page in records:
        page_number = page["page_number"]
        blocks = split_into_paragraphs(page["text"])

        for is_heading, block_text in blocks:
            if is_heading:
                current_section = block_text
                if buffer_tokens >= MIN_TOKENS:
                    flush()
                continue

            block_tok = count_tokens(block_text)

            rec_id_match = REC_ID_PREFIX.match(block_text)
            if rec_id_match:
                buffer_rec_ids.append(rec_id_match.group(1))

            touch_buffer_start(page_number)

            if block_tok > MAX_TOKENS:
                for piece in split_oversized(block_text, MAX_TOKENS):
                    piece_tok = count_tokens(piece)
                    if buffer_tokens + piece_tok > MAX_TOKENS and buffer_tokens >= MIN_TOKENS:
                        flush()
                        touch_buffer_start(page_number)
                    buffer_parts.append(piece)
                    buffer_tokens += piece_tok
                    if buffer_tokens >= TARGET_TOKENS:
                        flush()
                continue

            if buffer_tokens + block_tok > MAX_TOKENS and buffer_tokens >= MIN_TOKENS:
                flush()
                touch_buffer_start(page_number)

            buffer_parts.append(block_text)
            buffer_tokens += block_tok

            if buffer_tokens >= TARGET_TOKENS:
                flush()

    flush()
    if len(chunks) >= 2 and chunks[-1]["token_count"] < MERGE_FLOOR:
        last = chunks.pop()
        prev = chunks[-1]
        merged_text = prev["text"] + "\n\n" + last["text"]
        prev["text"] = merged_text
        prev["page_end"] = last["page_end"]
        prev["token_count"] = count_tokens(merged_text)
        prev["recommendation_ids"] = list(dict.fromkeys(
            prev["recommendation_ids"] + last["recommendation_ids"]
        ))

    return chunks


def main():
    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    all_chunks = []
    overrides = load_content_overrides()

    json_files = sorted(EXTRACTED_DIR.glob("*.json"))
    if not json_files:
        print(f"No extracted files found in {EXTRACTED_DIR}")
        return

    for jf in json_files:
        with open(jf, "r", encoding="utf-8") as f:
            records = json.load(f)

        document_name = records[0]["document_name"] if records else jf.stem

        for r in records:
            r["text"], _ = reattach_recommendation_ids(r["text"])

        records = filter_front_matter(records, document_name, overrides)

        doc_chunks = chunk_document(records)
        all_chunks.extend(doc_chunks)

        out_path = CHUNKS_DIR / (jf.stem + ".chunks.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(doc_chunks, f, ensure_ascii=False, indent=2)

        token_counts = [c["token_count"] for c in doc_chunks]
        avg_tok = sum(token_counts) / len(token_counts) if token_counts else 0
        print(f"[{jf.stem}] {len(doc_chunks)} chunks, avg {avg_tok:.0f} tokens "
              f"(min {min(token_counts, default=0)}, max {max(token_counts, default=0)})")


    with open(settings.CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"\nDone. {len(all_chunks)} total chunks -> "
          f"{settings.CHUNKS_FILE.relative_to(BASE_DIR)}")


if __name__ == "__main__":
    main()
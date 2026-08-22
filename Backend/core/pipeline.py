import json
from pathlib import Path

from helpers.config import get_settings
from helpers.logger import get_logger
from core.embeddings import get_embedding_model

from data.scripts.extract_pdf import process_document as _extract_one, load_sources
from data.scripts.chunk_documents import (
    reattach_recommendation_ids,
    filter_front_matter,
    load_content_overrides,
    chunk_document,
)
from core.build_vector_index import chunk_to_metadata, get_chroma_client

settings = get_settings()
logger = get_logger("pipeline")

STATE_FILE = settings.DATA_DIR / "pipeline_state.json"


def _load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_state(state: dict):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def _chunks_cache_path(document_name: str) -> Path:
    slug = "".join(c if c.isalnum() else "-" for c in document_name.lower()).strip("-")
    return settings.CHUNKS_FILE.parent / f"{slug}.chunks.json"


def chunk_extracted_json(json_path: Path) -> list:
    with open(json_path, "r", encoding="utf-8") as f:
        records = json.load(f)
    if not records:
        return []

    document_name = records[0]["document_name"]
    for r in records:
        r["text"], _ = reattach_recommendation_ids(r["text"])

    overrides = load_content_overrides()
    records = filter_front_matter(records, document_name, overrides)
    return chunk_document(records)


def embed_and_add_chunks(chunks: list, wipe: bool = False) -> int:
    if not chunks:
        return 0

    model = get_embedding_model()
    client = get_chroma_client()

    if wipe:
        try:
            client.delete_collection(settings.COLLECTION_NAME)
        except Exception:
            pass
        collection = client.create_collection(
            name=settings.COLLECTION_NAME, metadata={"hnsw:space": "cosine"},
        )
    else:
        try:
            collection = client.get_collection(settings.COLLECTION_NAME)
        except Exception:
            collection = client.create_collection(
                name=settings.COLLECTION_NAME, metadata={"hnsw:space": "cosine"},
            )

        document_names = {c["document_name"] for c in chunks}
        for name in document_names:
            try:
                collection.delete(where={"document_name": name})
            except Exception as e:
                logger.warning(f"Could not purge old chunks for '{name}' before re-indexing: {e}")

    ids = [c["chunk_id"] for c in chunks]
    texts = [c["text"] for c in chunks]
    metadatas = [chunk_to_metadata(c) for c in chunks]

    embeddings = model.encode(
        texts,
        batch_size=settings.BATCH_SIZE,
        show_progress_bar=False,
        normalize_embeddings=True,
    ).tolist()

    for i in range(0, len(ids), settings.ADD_STEP):
        collection.upsert(
            ids=ids[i:i + settings.ADD_STEP],
            embeddings=embeddings[i:i + settings.ADD_STEP],
            documents=texts[i:i + settings.ADD_STEP],
            metadatas=metadatas[i:i + settings.ADD_STEP],
        )

    return len(ids)


def run_full_pipeline(force: bool = False) -> dict:
    settings.EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
    settings.CHUNKS_FILE.parent.mkdir(parents=True, exist_ok=True)

    sources = load_sources()
    state = {} if force else _load_state()

    all_chunks = []
    chunks_to_index = []
    processed_docs = []
    skipped_docs = []

    for s in sources:
        document_name = s["document_name"]
        pdf_path = settings.RAW_PDF_DIR / s["filename"]
        if not pdf_path.exists():
            logger.warning(f"[skip] {s['filename']} not found in {settings.RAW_PDF_DIR}")
            continue

        pdf_mtime = pdf_path.stat().st_mtime
        prev = state.get(document_name)
        cache_path = _chunks_cache_path(document_name)

        unchanged = (
            not force
            and prev is not None
            and prev.get("pdf_mtime") == pdf_mtime
            and prev.get("collection_name") == settings.COLLECTION_NAME
            and prev.get("indexed") is True
            and cache_path.exists()
        )

        if unchanged:
            with open(cache_path, "r", encoding="utf-8") as f:
                doc_chunks = json.load(f)
            all_chunks.extend(doc_chunks)
            skipped_docs.append(document_name)
            continue

        extracted_path = _extract_one(s)
        if not extracted_path:
            continue

        doc_chunks = chunk_extracted_json(extracted_path)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(doc_chunks, f, ensure_ascii=False, indent=2)

        all_chunks.extend(doc_chunks)
        chunks_to_index.extend(doc_chunks)
        processed_docs.append(document_name)
        state[document_name] = {
            "pdf_mtime": pdf_mtime,
            "collection_name": settings.COLLECTION_NAME,
            "chunk_count": len(doc_chunks),
            "indexed": False,
        }

    if not processed_docs and not force:
        if settings.CHUNKS_FILE.exists():
            logger.info(f"Pipeline: {len(skipped_docs)} document(s) already indexed in "
                        f"'{settings.COLLECTION_NAME}', nothing to do.")
            return {
                "documents_processed": 0,
                "documents_skipped_cached": len(skipped_docs),
                "chunks_indexed": 0,
                "total_chunks": len(all_chunks),
            }
        logger.warning(
            f"All {len(skipped_docs)} document(s) report indexed=True, but "
            f"{settings.CHUNKS_FILE} is missing -- rebuilding it from cached "
            f"per-document chunks (no re-embedding needed)."
        )
        with open(settings.CHUNKS_FILE, "w", encoding="utf-8") as f:
            json.dump(all_chunks, f, ensure_ascii=False, indent=2)
        return {
            "documents_processed": 0,
            "documents_skipped_cached": len(skipped_docs),
            "chunks_indexed": 0,
            "total_chunks": len(all_chunks),
        }

    with open(settings.CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    indexed = embed_and_add_chunks(chunks_to_index, wipe=force)
    for name in processed_docs:
        state[name]["indexed"] = True
    _save_state(state)

    logger.info(
        f"Pipeline done: {len(processed_docs)} processed, "
        f"{len(skipped_docs)} skipped (cached), {indexed} chunks (re)indexed "
        f"into '{settings.COLLECTION_NAME}'"
    )
    return {
        "documents_processed": len(processed_docs),
        "documents_skipped_cached": len(skipped_docs),
        "chunks_indexed": indexed,
        "total_chunks": len(all_chunks),
    }


def ingest_single_document(document_name: str, source_url: str, filename: str) -> dict:
    source = {
        "document_name": document_name,
        "source_url": source_url,
        "filename": filename,
    }
    extracted_path = _extract_one(source)
    if not extracted_path:
        raise FileNotFoundError(f"Extraction failed for {filename}")

    chunks = chunk_extracted_json(extracted_path)
    if not chunks:
        return {"document_name": document_name, "chunks_indexed": 0}

    cache_path = _chunks_cache_path(document_name)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    combined = []
    if settings.CHUNKS_FILE.exists():
        with open(settings.CHUNKS_FILE, "r", encoding="utf-8") as f:
            combined = json.load(f)
    combined = [c for c in combined if c.get("document_name") != document_name]
    combined.extend(chunks)
    settings.CHUNKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(settings.CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)

    indexed = embed_and_add_chunks(chunks, wipe=False)

    pdf_path = settings.RAW_PDF_DIR / filename
    state = _load_state()
    state[document_name] = {
        "pdf_mtime": pdf_path.stat().st_mtime if pdf_path.exists() else None,
        "collection_name": settings.COLLECTION_NAME,
        "chunk_count": len(chunks),
        "indexed": True,
    }
    _save_state(state)

    logger.info(f"Ingested '{document_name}': {indexed} chunks added to '{settings.COLLECTION_NAME}'")
    return {"document_name": document_name, "chunks_indexed": indexed}
import json

import chromadb

from .embeddings import get_embedding_model
from helpers.config import get_settings
from helpers.logger import get_logger

settings = get_settings()
logger = get_logger("build_vector_index")


def load_chunks() -> list:
    if not settings.CHUNKS_FILE.exists():
        raise FileNotFoundError(
            f"{settings.CHUNKS_FILE} not found. Run chunk_documents.py first."
        )
    with open(settings.CHUNKS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def chunk_to_metadata(chunk: dict) -> dict:
    
    page_start = chunk.get("page_start")
    page_end = chunk.get("page_end")
    page_number = chunk.get("page_number")
    return {
        "document_name": chunk["document_name"],
        "source_url": chunk.get("source_url") or "unknown",
        "section_title": chunk.get("section_title") or "",
        "page_start": page_start if page_start is not None else -1,
        "page_end": page_end if page_end is not None else -1,
        "page_number": page_number if page_number is not None else -1,
        "recommendation_ids": ",".join(chunk.get("recommendation_ids", [])),
        "token_count": chunk["token_count"],
    }


def get_chroma_client():
    if settings.CHROMA_HOST:
        logger.info(f"Connecting to Chroma server at {settings.CHROMA_HOST}:{settings.CHROMA_PORT} ...")
        return chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
    settings.INDEX_DIR.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(settings.INDEX_DIR))


def main():
    chunks = load_chunks()
    if not chunks:
        logger.warning(f"No chunks found in {settings.CHUNKS_FILE}.")
        return

    sanitized_count = sum(
        1 for c in chunks
        if c.get("source_url") is None
        or c.get("page_start") is None
        or c.get("page_end") is None
        or c.get("page_number") is None
    )
    if sanitized_count:
        logger.warning(
            f"{sanitized_count}/{len(chunks)} chunk(s) have an unverified/missing "
            f"source_url or page number -- these will be indexed with sentinel "
            f"values ('unknown' / -1), not fabricated citations."
        )

    model = get_embedding_model()

    client = get_chroma_client()

    try:
        client.delete_collection(settings.COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(
        name=settings.COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    ids = [c["chunk_id"] for c in chunks]
    texts = [c["text"] for c in chunks]
    metadatas = [chunk_to_metadata(c) for c in chunks]

    logger.info(f"Embedding {len(chunks)} chunks (batch size {settings.BATCH_SIZE}) ...")
    embeddings = model.encode(
        texts,
        batch_size=settings.BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,
    ).tolist()

    for i in range(0, len(ids), settings.ADD_STEP):
        collection.add(
            ids=ids[i:i + settings.ADD_STEP],
            embeddings=embeddings[i:i + settings.ADD_STEP],
            documents=texts[i:i + settings.ADD_STEP],
            metadatas=metadatas[i:i + settings.ADD_STEP],
        )

    logger.info(
        f"Done. Indexed {collection.count()} chunks -> "
        f"{settings.INDEX_DIR.relative_to(settings.BASE_DIR)} (collection: '{settings.COLLECTION_NAME}')"
    )


if __name__ == "__main__":
    main()
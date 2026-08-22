import argparse

import chromadb
from sentence_transformers import SentenceTransformer

from helpers.config import get_settings

settings = get_settings()

QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "


def get_chroma_client():
    if settings.CHROMA_HOST:
        return chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
    return chromadb.PersistentClient(path=str(settings.INDEX_DIR))


def get_collection():
    client = get_chroma_client()
    return client.get_collection(settings.COLLECTION_NAME)


def search(query: str, top_k: int = 5, model=None, collection=None):
    """Returns a list of result dicts: text, metadata, distance."""
    if model is None:
        model = SentenceTransformer(settings.EMBEDDING_MODEL)
    if collection is None:
        collection = get_collection()

    query_embedding = model.encode(
        [QUERY_INSTRUCTION + query],
        normalize_embeddings=True,
    ).tolist()

    raw = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
    )

    results = []
    for i in range(len(raw["ids"][0])):
        results.append({
            "chunk_id": raw["ids"][0][i],
            "text": raw["documents"][0][i],
            "metadata": raw["metadatas"][0][i],
            "similarity": 1 - raw["distances"][0][i],
        })
    return results


def print_results(query: str, results: list):
    print(f'\nQuery: "{query}"\n' + "-" * 60)
    for rank, r in enumerate(results, start=1):
        md = r["metadata"]
        rec_ids = f" | rec_ids: {md['recommendation_ids']}" if md["recommendation_ids"] else ""
        print(f"[{rank}] similarity={r['similarity']:.3f} | {md['document_name']} "
              f"| p.{md['page_start']}-{md['page_end']} | {md['section_title']}{rec_ids}")
        print(f"    {r['text'][:150].strip()}...")
        print()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query", type=str)
    parser.add_argument("--top_k", type=int, default=5)
    args = parser.parse_args()

    results = search(args.query, top_k=args.top_k)
    print_results(args.query, results)


if __name__ == "__main__":
    main()

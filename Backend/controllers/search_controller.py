from .Base_controller import BaseController
from core.embeddings import get_embedding_model

QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "


class SearchController(BaseController):

    def search(self, query: str, top_k: int = 5) -> list:
        model = get_embedding_model()
        collection = self.get_collection()

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
            md = raw["metadatas"][0][i]
            results.append({
                "chunk_id": raw["ids"][0][i],
                "text": raw["documents"][0][i],
                "similarity": 1 - raw["distances"][0][i],
                "document_name": md.get("document_name", ""),
                "source_url": self._denormalize_str(md.get("source_url")),
                "section_title": md.get("section_title", ""),
                "page_start": self._denormalize_page(md.get("page_start")),
                "page_end": self._denormalize_page(md.get("page_end")),
                "recommendation_ids": self._split_recommendation_ids(
                    md.get("recommendation_ids", "")
                ),
            })
        return results

    @staticmethod
    def _denormalize_page(value):
    
        return None if value is None or value == -1 else value

    @staticmethod
    def _denormalize_str(value):

        return None if value is None or value == "unknown" else value

    @staticmethod
    def _split_recommendation_ids(value: str) -> list:
        if not value:
            return []
        return [rid for rid in value.split(",") if rid]
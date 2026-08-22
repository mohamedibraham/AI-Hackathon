from collections import Counter

from fastapi import HTTPException

from .Base_controller import BaseController


class InternalController(BaseController):

    def check_health(self) -> dict:
        try:
            client = self.get_chroma_client()
            client.heartbeat()
        except Exception as e:
            return {
                "status": "error",
                "chroma_connected": False,
                "collection_exists": False,
                "collection_name": self.settings.COLLECTION_NAME,
                "chunk_count": None,
                "detail": str(e),
            }

        try:
            collection = client.get_collection(self.settings.COLLECTION_NAME)
            chunk_count = collection.count()
            collection_exists = True
        except Exception:
            chunk_count = None
            collection_exists = False

        return {
            "status": "ok" if collection_exists else "degraded",
            "chroma_connected": True,
            "collection_exists": collection_exists,
            "collection_name": self.settings.COLLECTION_NAME,
            "chunk_count": chunk_count,
            "detail": None,
        }

    def _get_collection_or_503(self):
        try:
            return self.get_collection()
        except Exception as e:
            self.logger.error(f"'{self.settings.COLLECTION_NAME}' unavailable: {e}")
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Collection '{self.settings.COLLECTION_NAME}' is not available yet. "
                    f"Run build_vector_index.py first."
                ),
            )

    def get_stats(self) -> dict:
        collection = self._get_collection_or_503()
        items = collection.get(include=["metadatas"])
        metadatas = items["metadatas"]
        document_names = {
            m.get("document_name") for m in metadatas if m.get("document_name")
        }
        return {
            "total_chunks": len(metadatas),
            "total_documents": len(document_names),
            "collection_name": self.settings.COLLECTION_NAME,
            "embedding_model": self.settings.EMBEDDING_MODEL,
        }

    def list_documents(self) -> list:
        collection = self._get_collection_or_503()
        items = collection.get(include=["metadatas"])
        counts = Counter(
            m.get("document_name", "unknown") for m in items["metadatas"]
        )
        return [
            {"document_name": name, "chunk_count": count}
            for name, count in sorted(counts.items())
        ]

    def get_config_snapshot(self) -> dict:
        s = self.settings
        return {
            "app_name": s.app_name,
            "app_version": s.app_version,
            "collection_name": s.COLLECTION_NAME,
            "embedding_model": s.EMBEDDING_MODEL,
            "batch_size": s.BATCH_SIZE,
            "add_step": s.ADD_STEP,
            "chroma_mode": "server" if s.CHROMA_HOST else "local",
            "index_dir": str(s.INDEX_DIR),
        }

    def get_benchmark(self) -> dict:
        self._get_collection_or_503()  

        from core.evaluate_generation import run_benchmark

        try:
            return run_benchmark()
        except Exception as e:
            self.logger.error(f"Benchmark run failed: {e}")
            raise HTTPException(status_code=500, detail=f"Benchmark run failed: {e}")
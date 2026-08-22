from typing import Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    chroma_connected: bool
    collection_exists: bool
    collection_name: Optional[str] = None
    chunk_count: Optional[int] = None
    detail: Optional[str] = None


class StatsResponse(BaseModel):
    total_chunks: int
    total_documents: int
    collection_name: str
    embedding_model: str


class DocumentInfo(BaseModel):
    document_name: str
    chunk_count: int


class ConfigSnapshotResponse(BaseModel):
    app_name: str
    app_version: str
    collection_name: str
    embedding_model: str
    batch_size: int
    add_step: int
    chroma_mode: str
    index_dir: str
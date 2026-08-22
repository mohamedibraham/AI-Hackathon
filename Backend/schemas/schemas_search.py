from typing import List, Optional

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Clinical question")
    top_k: int = Field(5, ge=1, le=20, description="Number of recovered items")


class SearchResult(BaseModel):
    chunk_id: str
    text: str
    similarity: float
    document_name: str
    source_url: Optional[str] = None
    section_title: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    recommendation_ids: List[str] = Field(default_factory=list)


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
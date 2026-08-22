from typing import List, Optional

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Clinical question")
    top_k: int = Field(5, ge=1, le=20)


class CitationOut(BaseModel):
    marker: int
    chunk_id: str
    document_name: str
    section_title: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    source_url: str


class GenerateResponse(BaseModel):
    query: str
    risk_level: str 
    recommendation: str
    supporting_evidence: List[str]
    confidence: str
    safety_note: str
    citations: List[CitationOut]
    unsupported_claims: List[str]
    retrieved_chunk_count: int
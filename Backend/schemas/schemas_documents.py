from typing import Optional

from pydantic import BaseModel, HttpUrl, Field


class DocumentUploadRequest(BaseModel):
    url: HttpUrl = Field(..., description="Direct link to a PDF file from a reliable source.")
    document_name: Optional[str] = Field(
        None, description="The name referring to the document. If not provided, it is derived from the link."
    )


class DocumentUploadResponse(BaseModel):
    status: str  
    document_name: str
    source_url: str
    chunks_indexed: int
    detail: Optional[str] = None

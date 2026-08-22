from fastapi import APIRouter

from controllers.documents_controller import DocumentsController
from schemas.schemas_documents import DocumentUploadRequest, DocumentUploadResponse

upload_router = APIRouter(prefix="/documents", tags=["Documents"])


@upload_router.post("/upload", response_model=DocumentUploadResponse)
def upload_document(payload: DocumentUploadRequest):
    return DocumentsController().upload_from_url(
        url=payload.url, document_name=payload.document_name
    )

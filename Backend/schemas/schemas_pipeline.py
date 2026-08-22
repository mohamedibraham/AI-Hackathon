from pydantic import BaseModel


class PipelineRunResponse(BaseModel):
    documents_processed: int
    documents_skipped_cached: int
    chunks_indexed: int
    total_chunks: int
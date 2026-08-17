from pathlib import Path
from functools import lru_cache

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "AI Hackathon RAG"
    app_version: str = "0.1.0"

    CHROMA_HOST: str
    CHROMA_PORT: int
    COLLECTION_NAME: str
    EMBEDDING_MODEL: str

    BATCH_SIZE: int
    ADD_STEP: int 

    model_config = SettingsConfigDict(
        env_file=_BASE_DIR / ".env",  
    )

    @computed_field
    @property
    def BASE_DIR(self) -> Path:
        return _BASE_DIR

    @computed_field
    @property
    def DATA_DIR(self) -> Path:
        return _BASE_DIR / "data"

    @computed_field
    @property
    def RAW_PDF_DIR(self) -> Path:
        return self.DATA_DIR / "raw_pdfs"

    @computed_field
    @property
    def EXTRACTED_DIR(self) -> Path:
        return self.DATA_DIR / "extracted"

    @computed_field
    @property
    def CHUNKS_FILE(self) -> Path:
        return self.DATA_DIR / "chunks" / "chunks.json"

    @computed_field
    @property
    def INDEX_DIR(self) -> Path:
        return self.DATA_DIR / "chroma_index"


@lru_cache
def get_settings() -> Settings:
    return Settings()

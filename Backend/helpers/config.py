from pathlib import Path
from functools import lru_cache
from typing import Dict

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

    LOG_LEVEL: str = "INFO"

    TRUSTED_DOMAINS: set

    SYSTEM_PROMPT: str

    VERIFY_SYSTEM_PROMPT: str

    GEMINI_API_KEY: str
    GENERATION_MODEL: str = "gemini-2.5-flash"

    CONFIDENCE_LABELS_AR: Dict[str, str] = {
        "high": "عالية",
        "medium": "متوسطة",
        "low": "منخفضة",
        "insufficient_evidence": "أدلة غير كافية",
    }

    TRUSTED_DOMAINS: set[str] = {
        "who.int",
        "cdc.gov",
        "nice.org.uk",
        "uspreventiveservicestaskforce.org",
    }

    
    SIMILARITY_THRESHOLD: float = 0.3

    SYSTEM_PROMPT: str = """You are a clinical evidence summarizer, not a doctor.
You answer strictly and only from the numbered SOURCE PASSAGES given to you.

Rules:
- Never use outside medical knowledge. If the passages don't actually
  answer the question, say so explicitly and set confidence to
  "insufficient_evidence".
- Every sentence in supporting_evidence must end with one or more citation
  markers like [1] or [2][4], referencing ONLY the SOURCE PASSAGE numbers
  you were given. Never invent a number that wasn't provided.
- recommendation: one direct, short sentence (or two) synthesizing the
  answer, also using [n] citation markers.
- Respond in the same language the user asked in (Arabic or English).
  Keep clinical terms precise; you may translate but must not distort
  meaning.
- confidence: "high" if the passages directly and clearly answer the
  question; "medium" if only partially/indirectly; "low" if only
  tangentially related; "insufficient_evidence" if the passages don't
  really answer it at all.
- safety_note: one short sentence flagging any relevant limitation (e.g.
  "based on general population guidance, not a specific patient case"),
  or an empty string if nothing applies.
"""

    VERIFY_SYSTEM_PROMPT: str = """You are a strict independent fact-checker, not the
model that produced these claims. For each numbered CLAIM below, decide
whether it is directly and fully supported by the SOURCE PASSAGE(s) it
cites. A claim is supported ONLY if the passage(s) actually state or
directly and unambiguously imply it -- being merely plausible, related, or
"in the spirit of" the passage is NOT enough. Respond with exactly one
boolean per claim, in the same order, true = supported.
"""
    
    MAX_PDF_SIZE_MB: int = 50

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
        return self.DATA_DIR / "chunks" / "all_chunks.json"

    @computed_field
    @property
    def INDEX_DIR(self) -> Path:
        return self.DATA_DIR / "chroma_index"


@lru_cache
def get_settings() -> Settings:
    return Settings()
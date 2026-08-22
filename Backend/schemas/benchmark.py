from typing import List, Optional

from pydantic import BaseModel


class BenchmarkQuestionResult(BaseModel):
    question: str
    precision_at_5: float
    citations_checked: int
    citations_correct: int
    claims_generated: int
    claims_unsupported: int
    generation_failed: bool = False


class BenchmarkFailure(BaseModel):
    question: str
    error: str


class BenchmarkResponse(BaseModel):
    retrieval_precision_at_5: float
    citation_accuracy: float
    faithfulness: Optional[float] = None
    questions_evaluated: int
    questions_failed: int = 0
    generation_failures: List[BenchmarkFailure] = []
    details: List[BenchmarkQuestionResult]
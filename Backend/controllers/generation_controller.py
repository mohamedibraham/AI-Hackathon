from .Base_controller import BaseController
from .search_controller import SearchController
from core.generation import generate_answer
from core.safety import classify_input, EMERGENCY_REDIRECT_MESSAGE, CAUTION_PREFIX
from utils import response_signal


class GenerationController(BaseController):

    def answer(self, query: str, top_k: int = 5) -> dict:
        risk = classify_input(query)

        if risk == "reject":
            return {
                "query": query,
                "risk_level": "reject",
                "recommendation": EMERGENCY_REDIRECT_MESSAGE,
                "supporting_evidence": [],
                "confidence": self.settings.CONFIDENCE_LABELS_AR.get(
                    "insufficient_evidence", "insufficient_evidence"
                ),
                "safety_note": EMERGENCY_REDIRECT_MESSAGE,
                "citations": [],
                "unsupported_claims": [],
                "retrieved_chunk_count": 0,
            }

        results = SearchController().search(query, top_k=top_k)

        if not results or results[0]["similarity"] < self.settings.SIMILARITY_THRESHOLD:
            return {
                "query": query,
                "risk_level": risk,
                "recommendation": response_signal.FAILED_evidence,
                "supporting_evidence": [],
                "confidence": self.settings.CONFIDENCE_LABELS_AR.get(
                    "insufficient_evidence", "insufficient_evidence"
                ),
                "safety_note": response_signal.Safety_note,
                "citations": [],
                "unsupported_claims": [],
                "retrieved_chunk_count": len(results),
            }

        answer = generate_answer(query, results)

        if risk == "caution":
            answer["safety_note"] = (CAUTION_PREFIX + (answer.get("safety_note") or "")).strip()

        return {
            "query": query,
            "risk_level": risk,
            **answer,
            "retrieved_chunk_count": len(results),
        }
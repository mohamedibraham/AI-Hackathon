import re
from typing import List, Literal

from google import genai
from google.genai import types
from pydantic import BaseModel

from helpers.config import get_settings
from helpers.logger import get_logger
from utils import response_signal

settings = get_settings()
logger = get_logger("generation")

_client = None


def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


class GeneratedAnswer(BaseModel):
    recommendation: str
    supporting_evidence: List[str]
    confidence: Literal["high", "medium", "low", "insufficient_evidence"]
    safety_note: str


class ClaimVerification(BaseModel):
    verdicts: List[bool]


CITATION_MARKER = re.compile(r"\[(\d+)\]")

CONFIDENCE_RANK = {"insufficient_evidence": 0, "low": 1, "medium": 2, "high": 3}


def _page_label(start, end) -> str:

    if start is None or end is None:
        return "unknown"
    return f"{start}-{end}" if start != end else f"{start}"


def _build_context(chunks: list) -> str:
    parts = []
    for i, c in enumerate(chunks, start=1):
        parts.append(
            f"[{i}] (Document: {c['document_name']} | Section: "
            f"{c['section_title'] or 'N/A'} | Pages: {_page_label(c['page_start'], c['page_end'])})\n"
            f"{c['text']}"
        )
    return "\n\n".join(parts)


def _extract_indices(text: str) -> set:
    return {int(n) for n in CITATION_MARKER.findall(text)}


def _empty_result(message: str, note: str = "") -> dict:
    return {
        "recommendation": message,
        "supporting_evidence": [],
        "confidence": settings.CONFIDENCE_LABELS_AR.get(
            "insufficient_evidence", "insufficient_evidence"
        ),
        "safety_note": note,
        "citations": [],
        "unsupported_claims": [],
    }


def verify_claims(chunks: list, evidence: List[str]) -> List[bool]:
    if not evidence:
        return []

    context = _build_context(chunks)
    claims_block = "\n".join(f"{i + 1}. {e}" for i, e in enumerate(evidence))
    client = get_client()

    try:
        response = client.models.generate_content(
            model=settings.GENERATION_MODEL,
            contents=f"SOURCE PASSAGES:\n\n{context}\n\nCLAIMS:\n{claims_block}",
            config=types.GenerateContentConfig(
                system_instruction=settings.VERIFY_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ClaimVerification,
                temperature=0,
            ),
        )
        result: ClaimVerification = response.parsed
        if result and len(result.verdicts) == len(evidence):
            return result.verdicts
        logger.warning("Claim verification returned mismatched verdict count; treating as unverifiable.")
    except Exception as e:
        logger.error(f"Claim verification call failed: {e}")


    logger.warning(
        f"Verification unavailable for {len(evidence)} claim(s) -- "
        f"flagging all as unsupported (fail-closed) rather than assuming grounded."
    )
    return [False] * len(evidence)


def generate_answer(query: str, chunks: list) -> dict:
    if not chunks:
        return _empty_result(response_signal.FAILED_response)

    context = _build_context(chunks)
    client = get_client()

    try:
        response = client.models.generate_content(
            model=settings.GENERATION_MODEL,
            contents=f"SOURCE PASSAGES:\n\n{context}\n\nQUESTION: {query}",
            config=types.GenerateContentConfig(
                system_instruction=settings.SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=GeneratedAnswer,
                temperature=0.1,
            ),
        )
    except Exception as e:
        logger.error(f"Gemini generation call failed: {e}")
        return _empty_result(response_signal.FAILED_Model_connecting, str(e))

    answer: GeneratedAnswer = response.parsed
    if answer is None:
        logger.error(f"Failed to parse structured generation output: {response.text}")
        return _empty_result(response_signal.FAILED_Model_connecting)

    all_text = answer.recommendation + " " + " ".join(answer.supporting_evidence)
    cited_indices = _extract_indices(all_text)
    valid_indices = {i for i in cited_indices if 1 <= i <= len(chunks)}
    invalid = cited_indices - valid_indices
    if invalid:
        logger.warning(f"Model cited out-of-range source(s) {invalid} for query: {query!r}")

    citations = []
    unverified_citation_count = 0
    for i in sorted(valid_indices):
        c = chunks[i - 1]
        page_known = c["page_start"] is not None and c["page_end"] is not None
        source_known = bool(c["source_url"])
        if not (page_known and source_known):
            unverified_citation_count += 1
        citations.append({
            "marker": i,
            "chunk_id": c["chunk_id"],
            "document_name": c["document_name"],
            "section_title": c["section_title"],
            "page_start": c["page_start"] if page_known else None,
            "page_end": c["page_end"] if page_known else None,
            "source_url": c["source_url"] if source_known else "unknown",
        })

    verdicts = verify_claims(chunks, answer.supporting_evidence)
    unsupported_claims = [
        stmt for stmt, ok in zip(answer.supporting_evidence, verdicts) if not ok
    ]
    if unsupported_claims:
        logger.warning(
            f"{len(unsupported_claims)}/{len(answer.supporting_evidence)} "
            f"unsupported claim(s) flagged for query: {query!r}"
        )

    confidence_key = answer.confidence
    if (unverified_citation_count or unsupported_claims) and CONFIDENCE_RANK.get(confidence_key, 0) > CONFIDENCE_RANK["low"]:
        logger.warning(
            f"Downgrading confidence '{confidence_key}' -> 'low' "
            f"({unverified_citation_count} unverified citation(s), "
            f"{len(unsupported_claims)} unsupported claim(s))."
        )
        confidence_key = "low"

    return {
        "recommendation": answer.recommendation,
        "supporting_evidence": answer.supporting_evidence,
        "confidence": settings.CONFIDENCE_LABELS_AR.get(confidence_key, confidence_key),
        "safety_note": answer.safety_note,
        "citations": citations,
        "unsupported_claims": unsupported_claims,
    }
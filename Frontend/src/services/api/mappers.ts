import type {
  BenchmarkResponse,
  DocumentsResponse,
  GenerateResponse,
  HealthResponse,
  StatsResponse,
  UploadDocumentResponse,
} from "@/types/api";
import type {
  RawBenchmarkResponse,
  RawCitation,
  RawDocumentItem,
  RawGenerateResponse,
  RawHealthResponse,
  RawStatsResponse,
  RawUploadResponse,
} from "@/types/api-raw";

/** Backend gives no file-type flag — infer it from the name for the UI badge only. */
function inferSourceType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "html" || ext === "htm") return "html";
  return "txt";
}

export function mapHealth(raw: RawHealthResponse): HealthResponse {
  return {
    status: raw.chroma_connected && raw.collection_exists ? "ok" : "error",
    vector_store: raw.chroma_connected ? "connected" : "disconnected",
    collection_name: raw.collection_name,
    chunk_count: raw.chunk_count ?? 0,
  };
}

export function mapStats(raw: RawStatsResponse): StatsResponse {
  return {
    total_documents: raw.total_documents,
    total_chunks: raw.total_chunks,
    embedding_model: raw.embedding_model,
  };
}

export function mapDocuments(raw: RawDocumentItem[]): DocumentsResponse {
  return {
    documents: raw.map((d) => ({
      document_name: d.document_name,
      chunk_count: d.chunk_count,
      source_type: inferSourceType(d.document_name),
    })),
  };
}

/**
 * NOTE: the real /generate response has no chunk excerpt text — only
 * chunk_id, section_title, and page numbers. We surface section_title as
 * the closest available context instead of inventing quoted text.
 * Recommended backend fix: add `excerpt: chunk_text[:200]` to each citation
 * dict in the /generate handler so the Source Trace panel can show a real,
 * verifiable snippet instead of just the section title.
 */
function mapCitation(c: RawCitation) {
  return {
    marker: c.marker,
    document_name: c.document_name,
    chunk_id: c.chunk_id,
    page_start: c.page_start,
    page_end: c.page_end,
    line_start: null,
    line_end: null,
    section: c.section_title || null,
    excerpt: c.section_title || "",
  };
}

export function mapGenerate(raw: RawGenerateResponse): GenerateResponse {
  return {
    answer: raw.recommendation,
    citations: raw.citations.map(mapCitation),
    clinical_summary: {
      risk_level: raw.risk_level,
      confidence: raw.confidence,
      safety_note: raw.safety_note,
      supporting_evidence: raw.supporting_evidence,
    },
    unsupported_claims: raw.unsupported_claims,
    top_k: raw.retrieved_chunk_count,
  };
}

export function mapUpload(raw: RawUploadResponse): UploadDocumentResponse {
  return {
    // Backend sends "indexed"; the UI type still says "success" so no
    // component needs to change. Update both sides later if you'd rather
    // check `status === "indexed"` directly in the upload component.
    status: raw.status === "indexed" ? "success" : raw.status,
    chunks_indexed: raw.chunks_indexed,
    detail: raw.detail ?? `Indexed ${raw.document_name} successfully.`,
  };
}

export function mapBenchmark(raw: RawBenchmarkResponse): BenchmarkResponse {
  return {
    retrieval_precision_at_5: raw.retrieval_precision_at_5,
    citation_accuracy: raw.citation_accuracy,
    faithfulness: raw.faithfulness,
    questions_evaluated: raw.questions_evaluated,
    details: raw.details.map((d) => ({
      question: d.question,
      precision: d.precision_at_5,
      correct_citations: d.citations_correct,
      total_citations: d.citations_checked,
      unsupported_claims: d.claims_unsupported,
      total_claims: d.claims_generated,
    })),
  };
}
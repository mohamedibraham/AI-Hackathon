// Central API contract. Services and components MUST reuse these types.

export type RiskLevel = "allowed" | "caution" | "reject";

/** Backend returns confidence in Arabic. */
export type Confidence = "عالي" | "متوسط" | "منخفض" | "أدلة غير كافية";

export interface HealthResponse {
  status: "ok" | "error";
  vector_store: "connected" | "disconnected";
  collection_name: string;
  chunk_count: number;
}

export interface StatsResponse {
  total_documents: number;
  total_chunks: number;
  embedding_model: string;
}

export interface DocumentItem {
  document_name: string;
  chunk_count: number;
  source_type: string;
}

export interface DocumentsResponse {
  documents: DocumentItem[];
}

export interface Citation {
  marker: number;
  document_name: string;
  chunk_id: string;
  page_start: number | null;
  page_end: number | null;
  line_start: number | null;
  line_end: number | null;
  section: string | null;
  excerpt: string;
}

export interface ClinicalSummary {
  risk_level: RiskLevel;
  confidence: Confidence;
  safety_note: string;
  supporting_evidence: string[];
}

export interface GenerateResponse {
  answer: string;
  citations: Citation[];
  clinical_summary: ClinicalSummary;
  unsupported_claims: string[];
  top_k: number;
}

export interface GenerateRequest {
  query: string;
  top_k: number;
}

export interface UploadDocumentRequest {
  url: string;
  document_name?: string;
}

export interface UploadDocumentResponse {
  status: "success" | "rejected" | "error";
  chunks_indexed: number;
  detail: string;
}

export interface BenchmarkDetail {
  question: string;
  precision: number;
  correct_citations: number;
  total_citations: number;
  unsupported_claims: number;
  total_claims: number;
}

export interface BenchmarkResponse {
  retrieval_precision_at_5: number;
  citation_accuracy: number;
  faithfulness: number;
  questions_evaluated: number;
  details: BenchmarkDetail[];
}

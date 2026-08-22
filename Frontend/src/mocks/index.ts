import type {
  BenchmarkResponse,
  DocumentsResponse,
  GenerateResponse,
  HealthResponse,
  StatsResponse,
  UploadDocumentResponse,
} from "@/types/api";

export const mockHealth: HealthResponse = {
  status: "ok",
  vector_store: "connected",
  collection_name: "bp_guidelines_v3",
  chunk_count: 4812,
};

export const mockStats: StatsResponse = {
  total_documents: 14,
  total_chunks: 4812,
  embedding_model: "text-embedding-3-large",
};

export const mockDocuments: DocumentsResponse = {
  documents: [
    { document_name: "WHO_Hypertension_Guideline_2021.pdf", chunk_count: 812, source_type: "pdf" },
    { document_name: "NICE_NG136_Hypertension_Adults.pdf", chunk_count: 1043, source_type: "pdf" },
    { document_name: "CDC_High_Blood_Pressure_Facts.txt", chunk_count: 214, source_type: "txt" },
    { document_name: "USPSTF_BP_Screening_2021.pdf", chunk_count: 486, source_type: "pdf" },
    { document_name: "ESC_ESH_2023_Arterial_Hypertension.pdf", chunk_count: 1522, source_type: "pdf" },
    { document_name: "AHA_ACC_BP_Measurement_Protocol.html", chunk_count: 735, source_type: "html" },
  ],
};

export const mockGenerate = (query: string, top_k: number): GenerateResponse => ({
  answer:
    "For an adult with confirmed stage 1 hypertension and no established cardiovascular disease, guideline-directed care starts with a formal 10-year cardiovascular risk assessment before initiating pharmacotherapy [1]. Lifestyle modification — dietary sodium reduction below 2 g/day, weight reduction, and 150 minutes of moderate aerobic activity weekly — should be offered to every patient regardless of drug therapy [2]. When drug treatment is indicated, a thiazide-like diuretic, an ACE inhibitor or ARB, or a dihydropyridine calcium-channel blocker are all acceptable first-line agents, with the choice guided by age, ethnicity, and comorbidity [3]. Treatment should be titrated to a target of below 140/90 mmHg in the general adult population, and below 130/80 mmHg where tolerated in patients with diabetes or established cardiovascular disease [1]. Blood pressure should be re-checked within 4 weeks of any dose change [2].",
  citations: [
    {
      marker: 1,
      document_name: "NICE_NG136_Hypertension_Adults.pdf",
      chunk_id: "nice_ng136_c0412",
      page_start: 24,
      page_end: 25,
      line_start: null,
      line_end: null,
      section: "1.4 Treating and monitoring hypertension",
      excerpt:
        "Use clinical judgement and estimate 10-year cardiovascular risk before offering antihypertensive drug treatment to adults under 80 with stage 1 hypertension.",
    },
    {
      marker: 2,
      document_name: "WHO_Hypertension_Guideline_2021.pdf",
      chunk_id: "who_hyp2021_c0187",
      page_start: 11,
      page_end: 11,
      line_start: null,
      line_end: null,
      section: "Recommendation 3 — Lifestyle interventions",
      excerpt:
        "WHO recommends lifestyle interventions as first-line treatment, including salt reduction, a diet rich in fruit and vegetables, physical activity, and avoidance of tobacco and alcohol.",
    },
    {
      marker: 3,
      document_name: "CDC_High_Blood_Pressure_Facts.txt",
      chunk_id: "cdc_bpfacts_c0033",
      page_start: null,
      page_end: null,
      line_start: 22,
      line_end: 29,
      section: null,
      excerpt:
        "First-line medication classes include thiazide diuretics, ACE inhibitors, angiotensin II receptor blockers, and calcium channel blockers.",
    },
  ],
  clinical_summary: {
    risk_level: "caution",
    confidence: "متوسط",
    safety_note:
      "Recommendations are population-level and assume no pregnancy, no CKD stage 4-5, and no secondary cause of hypertension. Verify against the patient's full medication list before prescribing.",
    supporting_evidence: [
      "NICE NG136 §1.4.1 — risk assessment prior to pharmacotherapy",
      "WHO 2021 Recommendation 3 — lifestyle intervention for all adults",
      "CDC BP Facts — accepted first-line antihypertensive classes",
    ],
  },
  unsupported_claims:
    query.trim().length % 2 === 0
      ? []
      : ["Re-check blood pressure within 4 weeks of any dose change — interval not stated in retrieved sources."],
  top_k,
});

export const mockUpload: UploadDocumentResponse = {
  status: "success",
  chunks_indexed: 318,
  detail: "Document fetched, chunked and indexed into collection bp_guidelines_v3.",
};

export const mockBenchmark: BenchmarkResponse = {
  retrieval_precision_at_5: 0.86,
  citation_accuracy: 0.92,
  faithfulness: 0.89,
  questions_evaluated: 48,
  details: [
    {
      question: "What is the first-line treatment for stage 1 hypertension?",
      precision: 0.9,
      correct_citations: 9,
      total_citations: 10,
      unsupported_claims: 0,
      total_claims: 7,
    },
    {
      question: "When should ambulatory blood pressure monitoring be used?",
      precision: 0.8,
      correct_citations: 8,
      total_citations: 10,
      unsupported_claims: 1,
      total_claims: 6,
    },
    {
      question: "What is the BP target for adults with type 2 diabetes?",
      precision: 1,
      correct_citations: 10,
      total_citations: 10,
      unsupported_claims: 0,
      total_claims: 5,
    },
    {
      question: "How often should adults be screened for high blood pressure?",
      precision: 0.75,
      correct_citations: 6,
      total_citations: 9,
      unsupported_claims: 2,
      total_claims: 8,
    },
    {
      question: "Which antihypertensives are contraindicated in pregnancy?",
      precision: 0.85,
      correct_citations: 8,
      total_citations: 9,
      unsupported_claims: 0,
      total_claims: 6,
    },
  ],
};

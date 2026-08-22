import type { DocumentsResponse, StatsResponse } from "@/types/api";
import type { RawDocumentItem, RawStatsResponse } from "@/types/api-raw";
import { mockDocuments, mockStats } from "@/mocks";
import { USE_MOCK_DATA, delay, request } from "./client";
import { mapDocuments, mapStats } from "./mappers";

export async function getStats(): Promise<StatsResponse> {
  if (USE_MOCK_DATA) {
    await delay(400);
    return mockStats;
  }
  const raw = await request<RawStatsResponse>("/internal/stats");
  return mapStats(raw);
}

export async function getDocuments(): Promise<DocumentsResponse> {
  if (USE_MOCK_DATA) {
    await delay(500);
    return mockDocuments;
  }
  // Real endpoint returns a bare array, not { documents: [...] }.
  const raw = await request<RawDocumentItem[]>("/internal/documents");
  return mapDocuments(raw);
}
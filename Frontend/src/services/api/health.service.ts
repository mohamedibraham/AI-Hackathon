import type { HealthResponse } from "@/types/api";
import type { RawHealthResponse } from "@/types/api-raw";
import { mockHealth } from "@/mocks";
import { USE_MOCK_DATA, delay, request } from "./client";
import { mapHealth } from "./mappers";

export async function getHealth(): Promise<HealthResponse> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return mockHealth;
  }
  const raw = await request<RawHealthResponse>("/health");
  return mapHealth(raw);
}
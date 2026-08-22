import type { GenerateRequest, GenerateResponse } from "@/types/api";
import type { RawGenerateResponse } from "@/types/api-raw";
import { mockGenerate } from "@/mocks";
import { USE_MOCK_DATA, delay, request } from "./client";
import { mapGenerate } from "./mappers";

export async function generateAnswer(query: string, top_k: number): Promise<GenerateResponse> {
  if (USE_MOCK_DATA) {
    await delay(1200);
    return mockGenerate(query, top_k);
  }
  const body: GenerateRequest = { query, top_k };
  const raw = await request<RawGenerateResponse>("/generate", { method: "POST", body });
  return mapGenerate(raw);
}
import type { BenchmarkResponse } from "@/types/api";
import type { RawBenchmarkResponse } from "@/types/api-raw";
import { mockBenchmark } from "@/mocks";
import { USE_MOCK_DATA, delay, request } from "./client";
import { mapBenchmark } from "./mappers";

export async function getBenchmark(): Promise<BenchmarkResponse> {
  if (USE_MOCK_DATA) {
    await delay(600);
    return mockBenchmark;
  }
  const raw = await request<RawBenchmarkResponse>("/internal/benchmark");
  return mapBenchmark(raw);
}
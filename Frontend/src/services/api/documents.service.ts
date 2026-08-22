import type { UploadDocumentRequest, UploadDocumentResponse } from "@/types/api";
import type { RawUploadResponse } from "@/types/api-raw";
import { mockUpload } from "@/mocks";
import { USE_MOCK_DATA, delay, request } from "./client";
import { mapUpload } from "./mappers";

export async function uploadDocument(
  url: string,
  document_name?: string,
): Promise<UploadDocumentResponse> {
  if (USE_MOCK_DATA) {
    await delay(1600);
    return mockUpload;
  }
  const body: UploadDocumentRequest = document_name ? { url, document_name } : { url };
  const raw = await request<RawUploadResponse>("/documents/upload", { method: "POST", body });
  return mapUpload(raw);
}
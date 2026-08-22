/**
 * Base HTTP client. The backend base URL comes from a single env variable.
 * Never hardcode a base URL anywhere else in the app.
 */

export const API_BASE_URL: string = import.meta.env["VITE_API_BASE_URL"] ?? "";

/** Toggle: when true (or when no base URL is configured) services return mocks. */
export const USE_MOCK_DATA: boolean =
  String(import.meta.env["VITE_USE_MOCK_DATA"] ?? "true") === "true" || API_BASE_URL === "";

export class ApiError extends Error {
  status: number;
  detail: string | undefined;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal: signal ?? null,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload?.detail;
    } catch {
      detail = undefined;
    }
    throw new ApiError(`Request to ${path} failed (${response.status})`, response.status, detail);
  }

  return (await response.json()) as T;
}

/** Small helper so mock responses feel like real network calls. */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

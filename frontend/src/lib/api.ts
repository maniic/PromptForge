import type { ForgeRequest, ForgeResponse } from "@/types/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`Error (${status}): ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export async function forgeApi(
  input: string,
  signal?: AbortSignal
): Promise<ForgeResponse> {
  const body: ForgeRequest = { input };

  const response = await fetch(`${API_BASE}/api/forge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let detail = "Unknown error";
    try {
      const data = await response.json();
      detail = data.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<ForgeResponse>;
}

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) {
      return "Invalid input (422). Your text may be empty or too short.";
    }
    if (err.status === 502) {
      return "Granite API error (502). The upstream service is unavailable. Retry in a few seconds.";
    }
    return `Error (${err.status}): ${err.detail}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred.";
}

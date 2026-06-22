import { supabase, supabaseConfigError } from "./client";
import { ApiError, type ApiErrorCode } from "./apiError";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiRequest<T>(path: string, init?: RequestInit) {
  const session = supabaseConfigError ? null : await supabase.auth.getSession();
  const accessToken = session?.data.session?.access_token;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed with status ${response.status}`;
    let code: ApiErrorCode = "UNKNOWN_ERROR";
    let details: unknown;

    try {
      const parsed = JSON.parse(text) as {
        message?: string;
        error?: {
          code?: ApiErrorCode;
          message?: string;
          details?: unknown;
        };
      };
      message = parsed.error?.message || parsed.message || message;
      code = parsed.error?.code || code;
      details = parsed.error?.details;
    } catch {
      // Keep the raw response text when the body is not JSON.
    }

    throw new ApiError(message, response.status, code, details);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function apiBlobRequest(path: string, init?: RequestInit) {
  const session = supabaseConfigError ? null : await supabase.auth.getSession();
  const accessToken = session?.data.session?.access_token;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || `Request failed with status ${response.status}`, response.status);
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? "resumen-diario.pdf",
  };
}

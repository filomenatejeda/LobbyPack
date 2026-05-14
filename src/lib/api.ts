import { supabase, supabaseConfigError } from "./client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

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

    try {
      const parsed = JSON.parse(text) as { message?: string };
      message = parsed.message || message;
    } catch {
      // Keep the raw response text when the body is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

import { createClient } from "@supabase/supabase-js";

const runtimeConfig = window.__LOBBYPACK_CONFIG__;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? runtimeConfig?.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  runtimeConfig?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const isPlaceholderValue = (value?: string) =>
  !value || value.startsWith("tu_") || value.includes("example");

export const supabaseConfigError =
  isPlaceholderValue(supabaseUrl) || isPlaceholderValue(supabasePublishableKey)
    ? "Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY en .env para usar autenticacion."
    : null;

export const supabase = createClient(
  supabaseConfigError ? "https://placeholder.supabase.co" : (supabaseUrl ?? ""),
  supabaseConfigError
    ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.signature"
    : (supabasePublishableKey ?? ""),
);

export function createIsolatedSupabaseClient() {
  return createClient(supabaseUrl ?? "", supabasePublishableKey ?? "", {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

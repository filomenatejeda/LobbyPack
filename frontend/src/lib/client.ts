import { createClient } from "@supabase/supabase-js";

const runtimeConfig =
  typeof window === "undefined" ? undefined : window.__LOBBYPACK_CONFIG__;
const supabaseUrl = runtimeConfig?.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  runtimeConfig?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const isPlaceholderValue = (value?: string) =>
  !value || value.startsWith("tu_") || value.includes("example");

export const supabaseConfigError =
  isPlaceholderValue(supabaseUrl) || isPlaceholderValue(supabasePublishableKey)
    ? "Configura las variables publicas de Supabase para usar autenticacion."
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

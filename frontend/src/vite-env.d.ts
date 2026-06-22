/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEOAPIFY_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __LOBBYPACK_CONFIG__?: {
    VITE_API_BASE_URL?: string;
    VITE_AUTH_REDIRECT_URL?: string;
    VITE_GEOAPIFY_API_KEY?: string;
    VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
    VITE_SUPABASE_URL?: string;
  };
}

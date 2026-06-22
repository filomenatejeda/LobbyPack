function isLocalUrl(url: URL) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function isRunningLocally() {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function getSupabaseRedirectUrl(path: string) {
  const configuredRedirectUrl =
    window.__LOBBYPACK_CONFIG__?.VITE_AUTH_REDIRECT_URL ?? import.meta.env.VITE_AUTH_REDIRECT_URL;
  const fallbackUrl = new URL(path, window.location.origin);

  if (!configuredRedirectUrl) {
    return fallbackUrl.toString();
  }

  const redirectUrl = new URL(path, configuredRedirectUrl);

  if (!isRunningLocally() && isLocalUrl(redirectUrl)) {
    return fallbackUrl.toString();
  }

  return redirectUrl.toString();
}

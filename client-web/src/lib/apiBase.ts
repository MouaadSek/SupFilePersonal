/** Public API URL (OAuth redirects, direct browser links to download/preview). */
export function getPublicApiBase(): string {
  if (typeof window !== 'undefined') {
    // Derive at runtime so the Docker build-time hostname never leaks into the browser.
    // The API server always runs on port 3000 of the same host.
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

/** Axios / fetch base: same-origin proxy in the browser to avoid CORS. */
export function getApiBase(): string {
  if (typeof window !== 'undefined') return '/api';
  return getPublicApiBase();
}

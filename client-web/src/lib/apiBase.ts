/** Public API URL (OAuth redirects, direct browser links to download/preview). */
export function getPublicApiBase(): string {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:3000`;
    }
    return `https://backend.${hostname}`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}
/** Axios / fetch base: same-origin proxy in the browser to avoid CORS. */
export function getApiBase(): string {
  if (typeof window !== 'undefined') return '/api';
  return getPublicApiBase();
}
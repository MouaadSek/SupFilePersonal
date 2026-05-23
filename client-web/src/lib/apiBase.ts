/** Public API URL (OAuth redirects, direct browser links to download/preview). */
export function getPublicApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

/** Axios / fetch base: same-origin proxy in the browser to avoid CORS. */
export function getApiBase(): string {
  if (typeof window !== 'undefined') return '/api';
  return getPublicApiBase();
}

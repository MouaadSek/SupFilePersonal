import { getAuthToken } from '@/services/api/client';

/** Fetch API URLs that require auth (preview/download). */
export async function fetchWithAuth(url: string): Promise<Response> {
  const token = getAuthToken();
  let target = url;
  if (
    token &&
    (url.startsWith('http://') || url.startsWith('https://')) &&
    !url.includes('access_token=') &&
    !url.includes('token=')
  ) {
    const sep = url.includes('?') ? '&' : '?';
    target = `${url}${sep}access_token=${encodeURIComponent(token)}`;
  }
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(target, { headers });
}

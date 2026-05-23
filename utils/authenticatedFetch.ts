import { getAuthToken } from '@/services/api/client';

/** Fetch API URLs that require `Authorization: Bearer` (preview/download). */
export async function fetchWithAuth(url: string): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers });
}

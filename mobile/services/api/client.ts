import { API_BASE_URL, AUTH_TOKEN_KEY } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function loadStoredToken(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  authToken = stored;
  return stored;
}

export async function persistToken(token: string | null): Promise<void> {
  authToken = token;
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

export function fileDownloadUrl(fileId: string): string {
  return apiUrl(`/files/${fileId}/download`);
}

export function filePreviewUrl(fileId: string): string {
  return apiUrl(`/files/${fileId}/preview`);
}

/** Preview URL with JWT query param so `<Image>` can load without custom headers (iOS / Android). */
export function fileAuthenticatedPreviewUrl(fileId: string): string | undefined {
  const token = getAuthToken();
  if (!token) return undefined;
  return `${filePreviewUrl(fileId)}?access_token=${encodeURIComponent(token)}`;
}

export function folderZipUrl(folderId: string): string {
  return apiUrl(`/folders/${folderId}/zip`);
}

export function avatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return apiUrl(path);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true } = options;
  const reqHeaders: Record<string, string> = { ...headers };

  if (auth && authToken) {
    reqHeaders.Authorization = `Bearer ${authToken}`;
  }

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(apiUrl(path), {
    method,
    headers: reqHeaders,
    body: payload,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && String((data as { error: string }).error)) ||
      res.statusText ||
      'Request failed';
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

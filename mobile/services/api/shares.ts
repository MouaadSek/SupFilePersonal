import { apiRequest } from './client';
import type { ApiIncomingShare, ApiShare } from './types';

export async function apiListShares(): Promise<ApiShare[]> {
  return apiRequest<ApiShare[]>('/shares');
}

export async function apiSharedWithMe(): Promise<ApiIncomingShare[]> {
  return apiRequest<ApiIncomingShare[]>('/shares/with-me');
}

export async function apiCreateShare(body: {
  file_id?: string;
  folder_id?: string;
  expires_at?: string | null;
  password?: string | null;
}): Promise<ApiShare> {
  return apiRequest<ApiShare>('/shares', { method: 'POST', body });
}

export async function apiRevokeShare(id: string): Promise<void> {
  await apiRequest(`/shares/${id}`, { method: 'DELETE' });
}

import type { ApiFile, ApiFolder } from './types';
import { apiRequest } from './client';

export async function apiListTrash(): Promise<{ folders: ApiFolder[]; files: ApiFile[] }> {
  return apiRequest('/files/trash');
}

export async function apiEmptyTrash(): Promise<void> {
  await apiRequest('/files/trash/empty', { method: 'DELETE' });
}

export async function apiPurgeFile(id: string): Promise<void> {
  await apiRequest(`/files/${id}/permanent`, { method: 'DELETE' });
}

export async function apiPurgeFolder(id: string): Promise<void> {
  await apiRequest(`/folders/${id}/permanent`, { method: 'DELETE' });
}

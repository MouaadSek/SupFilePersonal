import type { ApiFile, ApiFolder } from './types';
import { apiRequest } from './client';

export async function apiListTrash(): Promise<{ folders: ApiFolder[]; files: ApiFile[] }> {
  return apiRequest('/trash');
}

export async function apiEmptyTrash(): Promise<void> {
  await apiRequest('/trash', { method: 'DELETE' });
}

export async function apiPurgeFile(id: string): Promise<void> {
  await apiRequest(`/trash/files/${id}`, { method: 'DELETE' });
}

export async function apiPurgeFolder(id: string): Promise<void> {
  await apiRequest(`/trash/folders/${id}`, { method: 'DELETE' });
}

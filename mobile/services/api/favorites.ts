import { apiRequest } from './client';

export type ApiFavoritesResponse = {
  file_ids: string[];
  folder_ids: string[];
};

export async function apiGetFavorites(): Promise<ApiFavoritesResponse> {
  return apiRequest<ApiFavoritesResponse>('/favorites');
}

export async function apiToggleFavoriteFile(fileId: string): Promise<{ favorited: boolean }> {
  return apiRequest<{ favorited: boolean }>(`/favorites/files/${fileId}`, { method: 'POST' });
}

export async function apiToggleFavoriteFolder(folderId: string): Promise<{ favorited: boolean }> {
  return apiRequest<{ favorited: boolean }>(`/favorites/folders/${folderId}`, { method: 'POST' });
}

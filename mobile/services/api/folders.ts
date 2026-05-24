import type { ApiFile, ApiFolder } from './types';
import { apiRequest } from './client';

export type FolderListing = {
  folder?: ApiFolder;
  folders: ApiFolder[];
  files: ApiFile[];
};

export async function apiListRoot(): Promise<FolderListing> {
  return apiRequest<FolderListing>('/folders');
}

export async function apiListFolder(folderId: string): Promise<FolderListing> {
  return apiRequest<FolderListing>(`/folders/${folderId}`);
}

export async function apiCreateFolder(name: string, parentId: string | null): Promise<ApiFolder> {
  return apiRequest<ApiFolder>('/folders', {
    method: 'POST',
    body: { name, parent_id: parentId },
  });
}

export async function apiUpdateFolder(
  id: string,
  patch: { name?: string; parent_id?: string | null },
): Promise<ApiFolder> {
  return apiRequest<ApiFolder>(`/folders/${id}`, { method: 'PATCH', body: patch });
}

export async function apiTrashFolder(id: string): Promise<void> {
  await apiRequest(`/folders/${id}`, { method: 'DELETE' });
}

export async function apiRestoreFolder(id: string): Promise<ApiFolder> {
  return apiRequest<ApiFolder>(`/folders/${id}/restore`, { method: 'POST' });
}

export async function apiInviteFolderMember(
  folderId: string,
  email: string,
  permission: 'read' | 'write' = 'read',
): Promise<void> {
  const user = await apiRequest<{ id: string }>(
    `/users/lookup?email=${encodeURIComponent(email.trim())}`,
  );
  await apiRequest(`/folders/${folderId}/members`, {
    method: 'POST',
    body: { user_id: user.id, permission },
  });
}

/** Remove a member from a shared folder. The user can always remove themselves
 *  (used by "Quitter le dossier"); the owner can remove anyone. */
export async function apiRemoveFolderMember(
  folderId: string,
  userId: string,
): Promise<void> {
  await apiRequest(`/folders/${folderId}/members/${userId}`, { method: 'DELETE' });
}

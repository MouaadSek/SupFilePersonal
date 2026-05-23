import * as FileSystem from 'expo-file-system/legacy';
import { apiRequest, apiUrl, getAuthToken, ApiError } from './client';
import type { ApiFile } from './types';

export async function apiGetFile(id: string): Promise<ApiFile> {
  return apiRequest<ApiFile>(`/files/${id}`);
}

export async function apiUpdateFile(
  id: string,
  patch: { name?: string; folder_id?: string | null },
): Promise<ApiFile> {
  return apiRequest<ApiFile>(`/files/${id}`, { method: 'PATCH', body: patch });
}

export async function apiTrashFile(id: string): Promise<void> {
  await apiRequest(`/files/${id}`, { method: 'DELETE' });
}

export async function apiRestoreFile(id: string): Promise<ApiFile> {
  return apiRequest<ApiFile>(`/files/${id}/restore`, { method: 'POST' });
}

export type UploadProgressHandler = (percent: number) => void;

export async function apiUploadFileWithProgress(
  localUri: string,
  name: string,
  mimeType: string,
  folderId: string | null,
  onProgress?: UploadProgressHandler,
  isCancelled?: () => boolean,
): Promise<ApiFile> {
  const token = getAuthToken();
  const parameters: Record<string, string> = {};
  if (folderId) parameters.folder_id = folderId;

  const task = FileSystem.createUploadTask(
    apiUrl('/files/upload'),
    localUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: mimeType || 'application/octet-stream',
      parameters,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    (data) => {
      if (isCancelled?.()) return;
      const total = data.totalBytesExpectedToSend || 1;
      const pct = Math.min(99, Math.round((data.totalBytesSent / total) * 100));
      onProgress?.(pct);
    },
  );

  const result = await task.uploadAsync();
  if (isCancelled?.()) {
    throw new Error('UPLOAD_CANCELLED');
  }
  if (!result) {
    throw new ApiError('Upload failed', 0);
  }
  if (result.status < 200 || result.status >= 300) {
    let message = 'Upload failed';
    try {
      const body = JSON.parse(result.body);
      if (body?.error) message = String(body.error);
    } catch {
      /* ignore */
    }
    throw new ApiError(message, result.status);
  }
  onProgress?.(100);
  return JSON.parse(result.body) as ApiFile;
}

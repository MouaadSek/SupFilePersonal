import * as FileSystem from 'expo-file-system/legacy';
import { fileAuthenticatedPreviewUrl, getAuthToken } from '@/services/api/client';

const inflight = new Map<string, Promise<string>>();

function cachePath(fileId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'bin';
  return `${FileSystem.cacheDirectory}preview_${fileId}.${safeExt}`;
}

/** Download authenticated preview/download to a local `file://` URI (video, audio, PDF). */
export async function resolveAuthenticatedMediaUri(
  fileId: string,
  remoteUri: string,
  ext: string,
): Promise<string> {
  if (!remoteUri.startsWith('http://') && !remoteUri.startsWith('https://')) {
    return remoteUri;
  }

  const dest = cachePath(fileId, ext);
  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) return dest;

  const key = dest;
  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const url = fileAuthenticatedPreviewUrl(fileId) ?? remoteUri;
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const result = await FileSystem.downloadAsync(url, dest, { headers });
    return result.uri;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

export function extensionForPreview(fileName: string, mimeType?: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot > 0) return lower.slice(dot + 1);
  if (mimeType?.includes('pdf')) return 'pdf';
  if (mimeType?.startsWith('video/')) return 'mp4';
  if (mimeType?.startsWith('audio/')) return 'm4a';
  return 'bin';
}

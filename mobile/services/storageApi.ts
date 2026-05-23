import { folderZipUrl } from '@/services/api/client';

/** Server-built ZIP (`GET /folders/:id/zip`) — requires auth on download. */
export async function fetchServerFolderZipUrl(folderId: string): Promise<string | null> {
  return folderZipUrl(folderId);
}

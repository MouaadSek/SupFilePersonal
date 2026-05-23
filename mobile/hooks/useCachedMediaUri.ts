import { useMemo } from 'react';
import type { FileItem } from '@/types';
import { fileAuthenticatedPreviewUrl } from '@/services/api/client';

/** Resolved URI for remote image thumbnails (auth query param when needed). */
export function useCachedMediaUri(file: FileItem | null): string | null {
  return useMemo(() => {
    if (!file) return null;
    if (file.localUri) return file.localUri;
    if (file.thumbnail) return file.thumbnail;
    if (file.id) return fileAuthenticatedPreviewUrl(file.id) ?? null;
    return file.previewUrl ?? file.downloadUrl ?? null;
  }, [file?.id, file?.localUri, file?.thumbnail, file?.previewUrl, file?.downloadUrl]);
}

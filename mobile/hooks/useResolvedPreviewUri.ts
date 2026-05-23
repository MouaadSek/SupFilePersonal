import { useEffect, useState } from 'react';
import type { FileItem } from '@/types';
import { fileAuthenticatedPreviewUrl } from '@/services/api/client';
import { extensionForPreview, resolveAuthenticatedMediaUri } from '@/utils/previewMediaCache';

/**
 * Resolves a playback/preview URI: local files pass through;
 * remote API URLs are cached to disk (required for reliable iOS video/audio).
 */
export function useResolvedPreviewUri(
  file: FileItem | null | undefined,
  enabled: boolean,
): { uri: string | null; loading: boolean; error: boolean } {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!file || !enabled) {
      setUri(null);
      setLoading(false);
      setError(false);
      return;
    }

    const local =
      file.localUri ||
      (file.thumbnail?.startsWith('file:') ? file.thumbnail : undefined);
    if (local) {
      setUri(local);
      setLoading(false);
      setError(false);
      return;
    }

    const remote =
      (file.id ? fileAuthenticatedPreviewUrl(file.id) : undefined) ||
      file.previewUrl ||
      file.downloadUrl ||
      null;

    if (!remote) {
      setUri(null);
      setLoading(false);
      setError(true);
      return;
    }

    if (!remote.startsWith('http://') && !remote.startsWith('https://')) {
      setUri(remote);
      setLoading(false);
      setError(false);
      return;
    }

    if (!file.id) {
      setUri(remote);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    void resolveAuthenticatedMediaUri(
      file.id,
      remote,
      extensionForPreview(file.name, file.mimeType),
    )
      .then((cached) => {
        if (!cancelled) {
          setUri(cached);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUri(remote);
          setLoading(false);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file?.id, file?.localUri, file?.previewUrl, file?.downloadUrl, file?.name, enabled]);

  return { uri, loading, error };
}

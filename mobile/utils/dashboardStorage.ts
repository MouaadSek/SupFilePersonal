import type { FileItem } from '@/types';
import { isActive } from '@/utils/fileTree';
import { effectiveMimeTypeForFile } from '@/utils/mimeFromFilename';

const CATEGORY = {
  videos: { label: 'Vidéos', color: '#ef4444' },
  photos: { label: 'Photos', color: '#10b981' },
  documents: { label: 'Documents', color: '#30a8fe' },
  audio: { label: 'Musique', color: '#f59e0b' },
  other: { label: 'Autres', color: '#94a3b8' },
} as const;

type CatKey = keyof typeof CATEGORY;

function categoryKeyForFile(file: FileItem): CatKey {
  if (file.type !== 'file') return 'other';
  const mime = effectiveMimeTypeForFile(file);
  if (mime.startsWith('video/')) return 'videos';
  if (mime.startsWith('image/')) return 'photos';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime.startsWith('text/') ||
    mime === 'application/pdf' ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('presentation') ||
    mime.includes('wordprocessing')
  ) {
    return 'documents';
  }
  return 'other';
}

/** Octets par catégorie (fichiers actifs uniquement). */
export function sumBytesByCategory(files: FileItem[]): Record<CatKey, number> {
  const acc: Record<CatKey, number> = {
    videos: 0,
    photos: 0,
    documents: 0,
    audio: 0,
    other: 0,
  };
  for (const f of files) {
    if (!isActive(f) || f.type !== 'file') continue;
    const sz = f.size ?? 0;
    if (sz <= 0) continue;
    acc[categoryKeyForFile(f)] += sz;
  }
  return acc;
}

export type StorageBreakdownSegment = {
  type: string;
  size: number;
  color: string;
};

/**
 * Segments pour le graphique : proportions réelles des fichiers,
 * mis à l’échelle pour que la somme égale `targetUsed` (état du compte démo).
 * Si aucun octet indexé, retourne `fallback`.
 */
export function buildDashboardBreakdown(
  files: FileItem[],
  targetUsed: number,
  fallback: StorageBreakdownSegment[],
): StorageBreakdownSegment[] {
  const acc = sumBytesByCategory(files);
  const rawSum = (Object.keys(acc) as CatKey[]).reduce((s, k) => s + acc[k], 0);
  if (rawSum < 1024) {
    return fallback.map((f) => ({ ...f }));
  }
  const scale = targetUsed / rawSum;
  const out: StorageBreakdownSegment[] = [];
  (Object.keys(acc) as CatKey[]).forEach((k) => {
    const size = acc[k] * scale;
    if (size > 0) {
      out.push({ type: CATEGORY[k].label, size, color: CATEGORY[k].color });
    }
  });
  out.sort((a, b) => b.size - a.size);
  return out;
}

/** 5 derniers fichiers par activité (modification ou création / upload). */
export function getRecentFilesForDashboard(files: FileItem[], limit = 5): FileItem[] {
  return [...files]
    .filter((f) => isActive(f) && f.type === 'file')
    .sort((a, b) => {
      const ta = Math.max(a.modifiedAt.getTime(), a.createdAt.getTime());
      const tb = Math.max(b.modifiedAt.getTime(), b.createdAt.getTime());
      return tb - ta;
    })
    .slice(0, limit);
}

export function lastActivityTimestamp(file: FileItem): number {
  return Math.max(file.modifiedAt.getTime(), file.createdAt.getTime());
}

export function lastActivityLabel(file: FileItem): 'Modifié' | 'Ajouté' {
  return file.modifiedAt.getTime() >= file.createdAt.getTime() ? 'Modifié' : 'Ajouté';
}

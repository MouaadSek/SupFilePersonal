import type { FileItem, IncomingShareEntry, ShareLink, User } from '@/types';
import type {
  ApiFile,
  ApiFolder,
  ApiIncomingShare,
  ApiShare,
  ApiStorageBreakdown,
  ApiUser,
} from './types';
import {
  apiUrl,
  avatarUrl,
  fileAuthenticatedPreviewUrl,
  fileDownloadUrl,
  filePreviewUrl,
  publicShareUrl,
} from './client';
import type { StorageBreakdownSegment } from '@/utils/dashboardStorage';
import { parseApiDate } from '@/utils/parseApiDate';

const BREAKDOWN_CATEGORY: Record<
  string,
  { label: string; color: string }
> = {
  images: { label: 'Photos', color: '#10b981' },
  videos: { label: 'Vidéos', color: '#ef4444' },
  audio: { label: 'Musique', color: '#f59e0b' },
  documents: { label: 'Documents', color: '#30a8fe' },
  other: { label: 'Autres', color: '#94a3b8' },
};

export function mapApiBreakdownSegments(rows: ApiStorageBreakdown[]): StorageBreakdownSegment[] {
  return rows
    .map((row) => {
      const meta = BREAKDOWN_CATEGORY[row.category] ?? BREAKDOWN_CATEGORY.other;
      const size = Number(row.total_size ?? row.size) || 0;
      return { type: meta.label, size, color: meta.color };
    })
    .filter((s) => s.size > 0)
    .sort((a, b) => b.size - a.size);
}

export function mapApiUser(u: ApiUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.display_name || u.email.split('@')[0],
    avatar: avatarUrl(u.avatar_url ?? undefined),
    createdAt: u.created_at ? new Date(u.created_at) : new Date(),
    storageUsed: Number(u.quota_used) || 0,
    storageLimit: Number(u.quota_total) || 0,
  };
}

export function mapApiFolder(
  f: ApiFolder,
  path: string,
  opts?: { deletedAt?: Date; deleteGroupId?: string },
): FileItem {
  const modifiedAt = parseApiDate(f.updated_at);
  return {
    id: f.id,
    name: f.name,
    type: 'folder',
    createdAt: parseApiDate(f.created_at, modifiedAt),
    modifiedAt,
    parentId: f.parent_id,
    path,
    itemCount: Number(f.item_count) || 0,
    ...(opts?.deletedAt ? { deletedAt: opts.deletedAt, deleteGroupId: opts.deleteGroupId ?? f.id } : {}),
  };
}

export function mapApiFile(
  f: ApiFile,
  path: string,
  opts?: { deletedAt?: Date; deleteGroupId?: string; withUrls?: boolean },
): FileItem {
  const modifiedAt = parseApiDate(f.updated_at);
  const mime = f.mime_type || 'application/octet-stream';
  const isImage =
    mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif|bmp|svg)$/i.test(f.name);
  return {
    id: f.id,
    name: f.name,
    type: 'file',
    mimeType: mime,
    size: Number(f.size) || 0,
    createdAt: parseApiDate(f.created_at, modifiedAt),
    modifiedAt,
    parentId: f.folder_id,
    path,
    ...(opts?.withUrls !== false
      ? {
          downloadUrl: fileDownloadUrl(f.id),
          previewUrl: filePreviewUrl(f.id),
          ...(isImage
            ? { thumbnail: fileAuthenticatedPreviewUrl(f.id) ?? filePreviewUrl(f.id) }
            : {}),
        }
      : {}),
    ...(opts?.deletedAt ? { deletedAt: opts.deletedAt, deleteGroupId: opts.deleteGroupId ?? f.id } : {}),
  };
}

export function buildPath(parentPath: string | null, name: string): string {
  if (!parentPath) return `/${name}`;
  return `${parentPath}/${name}`.replace(/\/+/g, '/');
}

export function mapApiShare(s: ApiShare): ShareLink {
  const targetType = s.file_id ? 'file' : 'folder';
  const targetId = (s.file_id || s.folder_id)!;
  return {
    id: s.id,
    targetId,
    targetType,
    token: s.token,
    url: publicShareUrl(s.token),
    expiresAt: s.expires_at ? new Date(s.expires_at) : undefined,
    createdAt: new Date(s.created_at),
    downloads: 0,
    ...(s.password_protected ? { password: '••••••' } : {}),
  };
}

export function mapIncomingShare(s: ApiIncomingShare): IncomingShareEntry {
  return {
    id: s.id,
    itemType: 'folder',
    name: s.name,
    ownerLabel: s.shared_by_name || s.shared_by_email || 'Utilisateur',
    sharedAt: new Date(s.created_at),
  };
}

import type { FileItem } from '@/types';
import { isActive } from '@/utils/fileTree';
import type { FolderListing } from './folders';
import { buildPath, mapApiFile, mapApiFolder } from './mappers';

function folderBasePath(listing: FolderListing, files: FileItem[]): string {
  if (!listing.folder) return '';
  const parentPath = listing.folder.parent_id
    ? files.find((f) => f.id === listing.folder!.parent_id && f.type === 'folder')?.path ?? ''
    : '';
  return buildPath(parentPath || null, listing.folder.name);
}

/** Merge a folder listing response into the flat files cache. */
export function mergeFolderListing(files: FileItem[], listing: FolderListing): FileItem[] {
  const folderId = listing.folder?.id ?? null;
  const base = folderBasePath(listing, files);

  const childItems: FileItem[] = [
    ...listing.folders.map((f) => mapApiFolder(f, buildPath(base || null, f.name))),
    ...listing.files.map((f) => mapApiFile(f, buildPath(base || null, f.name))),
  ];
  const childIds = new Set(childItems.map((c) => c.id));

  let next = files.filter((f) => {
    if (!isActive(f)) return true;
    if (childIds.has(f.id)) return false;
    if (folderId === null) return f.parentId !== null;
    return f.parentId !== folderId;
  });

  if (listing.folder) {
    const mapped = mapApiFolder(listing.folder, base || `/${listing.folder.name}`);
    const hasFolder = next.some((f) => f.id === listing.folder!.id);
    next = hasFolder
      ? next.map((f) => (f.id === listing.folder!.id ? mapped : f))
      : [...next, mapped];
  }

  return [...next, ...childItems];
}

export function mapTrashListing(trash: {
  folders: import('./types').ApiFolder[];
  files: import('./types').ApiFile[];
}): FileItem[] {
  const items: FileItem[] = [];
  for (const f of trash.folders) {
    const path = `/${f.name}`;
    items.push(
      mapApiFolder(f, path, {
        deletedAt: new Date(f.updated_at),
        deleteGroupId: f.id,
      }),
    );
  }
  for (const f of trash.files) {
    const path = `/${f.name}`;
    items.push(
      mapApiFile(f, path, {
        deletedAt: new Date(f.updated_at),
        deleteGroupId: f.id,
        withUrls: true,
      }),
    );
  }
  return items;
}

export function replaceTrashInCache(files: FileItem[], trashed: FileItem[]): FileItem[] {
  const withoutTrash = files.filter((f) => !f.deletedAt);
  return [...withoutTrash, ...trashed];
}

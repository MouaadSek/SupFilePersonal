import type { FileItem } from '@/types';

export function isActive(f: FileItem): boolean {
  return !f.deletedAt;
}

/** Tous les ids du sous-arbre (racine incluse). */
export function collectSubtreeIds(rootId: string, all: FileItem[]): Set<string> {
  const ids = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const node of all) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        added = true;
      }
    }
  }
  return ids;
}

/** Dossiers cibles interdits : les éléments déplacés et descendants des dossiers déplacés. */
export function excludedMoveTargetFolderIds(itemIds: string[], all: FileItem[]): Set<string> {
  const ex = new Set<string>();
  for (const id of itemIds) {
    const it = all.find((f) => f.id === id && isActive(f));
    if (it?.type === 'folder') {
      for (const sid of collectSubtreeIds(it.id, all)) {
        const n = all.find((f) => f.id === sid);
        if (n?.type === 'folder') ex.add(sid);
      }
    }
  }
  return ex;
}

export function buildPathForItem(parentId: string | null, name: string, all: FileItem[]): string {
  const parentPath = parentId
    ? all.find((f) => f.id === parentId && isActive(f))?.path ?? ''
    : '';
  if (!parentPath) return `/${name}`;
  return `${parentPath}/${name}`.replace(/\/+/g, '/');
}

export function trashRootItems(all: FileItem[]): FileItem[] {
  const trashed = all.filter((f) => f.deletedAt);
  const roots: FileItem[] = [];
  for (const item of trashed) {
    if (!item.parentId || !trashed.some((p) => p.id === item.parentId)) {
      roots.push(item);
    }
  }
  return roots;
}

/** Direct children in the flat cache (folders + files). */
export function countDirectChildren(folderId: string, all: FileItem[]): number {
  return all.filter((f) => isActive(f) && f.parentId === folderId).length;
}

/**
 * Keep each folder's `itemCount` aligned with cached direct children.
 * Pass parentIds when you know which folders changed (upload, trash, move, listing merge).
 */
export function syncFolderItemCounts(
  files: FileItem[],
  parentIds?: Iterable<string | null>,
): FileItem[] {
  const targets = parentIds
    ? new Set(parentIds)
    : null;

  return files.map((f) => {
    if (f.type !== 'folder' || !isActive(f)) return f;
    if (targets && !targets.has(f.id)) return f;
    const count = countDirectChildren(f.id, files);
    const hasChildrenInCache = files.some((c) => isActive(c) && c.parentId === f.id);
    if (!hasChildrenInCache && typeof f.itemCount === 'number' && f.itemCount >= 0) {
      return f;
    }
    if (f.itemCount === count) return f;
    return { ...f, itemCount: count };
  });
}

/** Nombre d’éléments directs affiché pour un dossier. */
export function folderChildCount(folder: FileItem, all: FileItem[]): number {
  const local = countDirectChildren(folder.id, all);
  if (local > 0) return local;
  if (typeof folder.itemCount === 'number' && folder.itemCount >= 0) {
    return folder.itemCount;
  }
  return 0;
}

export function formatFolderChildLabel(count: number): string {
  return count <= 1 ? `${count} élément` : `${count} éléments`;
}

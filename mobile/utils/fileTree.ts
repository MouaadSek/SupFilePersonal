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
  const joined = parentPath ? `${parentPath}/${name}` : `/${name}`;
  return joined.replace(/\/+/g, '/');
}

/** Racines visibles à la corbeille : supprimé et le parent n’est pas supprimé dans le même groupe. */
export function trashRootItems(all: FileItem[]): FileItem[] {
  const trashed = all.filter((f) => f.deletedAt);
  return trashed.filter((item) => {
    if (!item.parentId) return true;
    const parent = all.find((p) => p.id === item.parentId);
    if (!parent?.deletedAt) return true;
    return parent.deleteGroupId !== item.deleteGroupId;
  });
}

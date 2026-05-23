import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { FileItem, ShareLink, IncomingShareEntry } from '@/types';
import { mockFiles, mockSharedLinks, mockIncomingShares } from '@/data/mockData';
import {
  isActive,
  collectSubtreeIds,
  excludedMoveTargetFolderIds,
  buildPathForItem,
  trashRootItems,
} from '@/utils/fileTree';

function lastExtensionLower(filename: string): string | null {
  const i = filename.lastIndexOf('.');
  if (i <= 0) return null;
  return filename.slice(i).toLowerCase();
}

function randomShareToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Local pick ou métadonnées API ; avec `uri`, fichier prévisualisable hors ligne */
export type UploadFileInput = {
  name: string;
  mimeType?: string;
  size?: number;
  uri?: string;
};

export type UploadJobView = {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
};

interface FilesContextType {
  files: FileItem[];
  currentFolder: string | null;
  selectedFiles: string[];
  isLoading: boolean;
  breadcrumbs: { id: string | null; name: string }[];
  uploadJobs: UploadJobView[];
  navigateToFolder: (folderId: string | null) => void;
  getFilesInFolder: (folderId: string | null) => FileItem[];
  selectFile: (fileId: string) => void;
  deselectFile: (fileId: string) => void;
  clearSelection: () => void;
  toggleSelection: (fileId: string) => void;
  createFolder: (name: string, parentId: string | null) => Promise<FileItem>;
  renameItem: (itemId: string, newName: string) => Promise<void>;
  /** Met à la corbeille (suppression douce) */
  softDeleteItems: (itemIds: string[]) => Promise<void>;
  moveItems: (itemIds: string[], targetFolderId: string | null) => Promise<void>;
  uploadFile: (file: UploadFileInput, parentId: string | null) => Promise<FileItem>;
  /** Upload avec barre de progression simulée (remplacer par progression réelle XHR côté API) */
  enqueueUploadWithProgress: (
    file: UploadFileInput,
    parentId: string | null,
  ) => Promise<FileItem | null>;
  dismissCompletedUploads: () => void;
  refreshCurrentFolder: () => Promise<void>;
  cancelUploadJob: (jobId: string) => void;
  getFileById: (fileId: string) => FileItem | undefined;
  searchFiles: (query: string) => FileItem[];
  getTrashRoots: () => FileItem[];
  restoreTrashGroup: (trashRootId: string) => Promise<void>;
  permanentlyDeleteTrashGroup: (trashRootId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  shareLinks: ShareLink[];
  incomingShares: IncomingShareEntry[];
  createPublicShareLink: (opts: {
    targetId: string;
    targetType: 'file' | 'folder';
    password?: string | null;
    expiresInDays: number | null;
  }) => ShareLink;
  revokePublicShareLink: (linkId: string) => void;
  /** Dossier visible à la racine du destinataire après acceptation (démo : message seulement). */
  inviteUserToFolder: (folderId: string, recipientEmail: string) => void;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

function randomGroupId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const UPLOAD_CANCELLED = 'UPLOAD_CANCELLED';

/** Copie les `content://` (SAF) vers un `file://` persistant pour prévisualisation et accès stable. */
async function persistUploadedLocalUri(
  uri: string | undefined,
  fileName: string,
): Promise<string | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith('file:')) return uri;
  if (!uri.startsWith('content:') || !FileSystem.documentDirectory) return uri;
  const safe = (fileName.trim() || 'fichier').replace(/[^\w.\-()+ ]+/g, '_').slice(0, 160);
  const dir = `${FileSystem.documentDirectory}imports/`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = `${dir}${Date.now()}_${safe}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

function uniqueCopyName(originalName: string, parentId: string | null, all: FileItem[]): string {
  const dot = originalName.lastIndexOf('.');
  const hasExt =
    dot > 0 &&
    dot < originalName.length - 1 &&
    /^\.[^./\\]+$/.test(originalName.slice(dot));
  const base = hasExt ? originalName.slice(0, dot) : originalName;
  const ext = hasExt ? originalName.slice(dot) : '';
  let n = 0;
  let candidate = `${base} (copie)${ext}`;
  const taken = (name: string) =>
    all.some((f) => isActive(f) && f.parentId === parentId && f.name === name);
  while (taken(candidate)) {
    n += 1;
    candidate = `${base} (copie ${n})${ext}`;
  }
  return candidate;
}

export function FilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<FileItem[]>(mockFiles);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>(() => [...mockSharedLinks]);
  const [incomingShares] = useState<IncomingShareEntry[]>(() => [...mockIncomingShares]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadJobs, setUploadJobs] = useState<UploadJobView[]>([]);
  const uploadAbortRef = useRef<Record<string, boolean>>({});

  const getBreadcrumbs = (): { id: string | null; name: string }[] => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Accueil' }];
    if (currentFolder) {
      let folder = files.find((f) => f.id === currentFolder && isActive(f));
      const pathCrumbs: { id: string | null; name: string }[] = [];
      while (folder) {
        pathCrumbs.unshift({ id: folder.id, name: folder.name });
        const parentId = folder.parentId;
        folder = parentId ? files.find((f) => f.id === parentId && isActive(f)) : undefined;
      }
      crumbs.push(...pathCrumbs);
    }
    return crumbs;
  };

  const navigateToFolder = (folderId: string | null) => {
    if (folderId === null) {
      setCurrentFolder(null);
      setSelectedFiles([]);
      return;
    }
    const f = files.find((x) => x.id === folderId);
    if (!f || f.deletedAt || f.type !== 'folder') return;
    setCurrentFolder(folderId);
    setSelectedFiles([]);
  };

  const getFilesInFolder = (folderId: string | null) => {
    return files.filter((f) => isActive(f) && f.parentId === folderId);
  };

  const selectFile = (fileId: string) => {
    setSelectedFiles((prev) => [...prev, fileId]);
  };

  const deselectFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((id) => id !== fileId));
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const toggleSelection = (fileId: string) => {
    if (selectedFiles.includes(fileId)) deselectFile(fileId);
    else selectFile(fileId);
  };

  const createFolder = async (name: string, parentId: string | null): Promise<FileItem> => {
    const trimmed = name.trim();
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    let created: FileItem | null = null;
    setFiles((prev) => {
      const dup = prev.some(
        (f) => isActive(f) && f.parentId === parentId && f.name === trimmed,
      );
      if (dup || !trimmed) return prev;
      const parentPath = parentId
        ? prev.find((f) => f.id === parentId && isActive(f))?.path || ''
        : '';
      const path = `${parentPath}/${trimmed}`.replace(/\/+/g, '/') || `/${trimmed}`;
      const newFolder: FileItem = {
        id: Date.now().toString(),
        name: trimmed,
        type: 'folder',
        createdAt: new Date(),
        modifiedAt: new Date(),
        parentId,
        path,
      };
      created = newFolder;
      return [...prev, newFolder];
    });

    setIsLoading(false);
    if (!created) {
      Alert.alert(
        'Dossier',
        trimmed
          ? 'Un dossier du même nom existe déjà ici.'
          : 'Le nom du dossier ne peut pas être vide.',
      );
      throw new Error('createFolder failed');
    }
    return created;
  };

  const renameItem = async (itemId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 250));

    let duplicateBlocked = false;
    let extensionBlocked = false;

    setFiles((prev) => {
      const item = prev.find((f) => f.id === itemId && isActive(f));
      if (!item) return prev;
      if (item.name === trimmed) return prev;

      if (item.type === 'file') {
        const origExt = lastExtensionLower(item.name);
        if (origExt) {
          const nextExt = lastExtensionLower(trimmed);
          if (nextExt !== origExt) {
            extensionBlocked = true;
            return prev;
          }
        }
      }

      const duplicate = prev.some(
        (f) =>
          isActive(f) &&
          f.id !== itemId &&
          f.parentId === item.parentId &&
          f.name === trimmed,
      );
      if (duplicate) {
        duplicateBlocked = true;
        return prev;
      }

      const parentPath = item.parentId
        ? prev.find((f) => f.id === item.parentId && isActive(f))?.path ?? ''
        : '';
      const newBasePath = parentPath ? `${parentPath}/${trimmed}` : `/${trimmed}`;
      const oldPath = item.path;

      return prev.map((f) => {
        if (f.id === itemId) {
          return { ...f, name: trimmed, path: newBasePath, modifiedAt: new Date() };
        }
        if (f.path.startsWith(`${oldPath}/`)) {
          return { ...f, path: `${newBasePath}${f.path.slice(oldPath.length)}` };
        }
        return f;
      });
    });

    setIsLoading(false);
    if (duplicateBlocked) {
      Alert.alert(
        'Nom déjà utilisé',
        'Un autre fichier ou dossier porte déjà ce nom dans ce dossier.',
      );
    }
    if (extensionBlocked) {
      Alert.alert(
        'Extension obligatoire',
        'Vous ne pouvez pas modifier ou supprimer l’extension de ce fichier.',
      );
    }
  };

  const softDeleteItems = async (itemIds: string[]) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    const groupId = randomGroupId();
    const now = new Date();

    setFiles((prev) => {
      const expanded = new Set<string>();
      for (const id of itemIds) {
        if (prev.some((f) => f.id === id && isActive(f))) {
          collectSubtreeIds(id, prev).forEach((sid) => expanded.add(sid));
        }
      }
      return prev.map((f) =>
        expanded.has(f.id) && isActive(f)
          ? { ...f, deletedAt: now, deleteGroupId: groupId }
          : f,
      );
    });
    setSelectedFiles([]);
    setIsLoading(false);
  };

  const moveItems = async (itemIds: string[], targetFolderId: string | null) => {
    let invalidTarget = false;
    let dupName = false;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 250));

    setFiles((prev) => {
      let next = [...prev];
      const ex = excludedMoveTargetFolderIds(itemIds, next);
      if (targetFolderId && ex.has(targetFolderId)) {
        invalidTarget = true;
        return prev;
      }
      if (targetFolderId) {
        const t = next.find((f) => f.id === targetFolderId && isActive(f));
        if (!t || t.type !== 'folder') {
          invalidTarget = true;
          return prev;
        }
      }

      for (const moveId of itemIds) {
        const node = next.find((f) => f.id === moveId && isActive(f));
        if (!node) continue;
        const oldPath = node.path;
        const newParentId = targetFolderId;
        if (
          next.some(
            (f) =>
              isActive(f) &&
              f.id !== moveId &&
              f.parentId === newParentId &&
              f.name === node.name,
          )
        ) {
          dupName = true;
          return prev;
        }
        const newPath = buildPathForItem(newParentId, node.name, next);
        const idSet = collectSubtreeIds(moveId, next);
        next = next.map((f) => {
          if (!idSet.has(f.id) || !isActive(f)) return f;
          if (f.id === moveId) {
            return { ...f, parentId: newParentId, path: newPath, modifiedAt: new Date() };
          }
          const suffix =
            f.path.length > oldPath.length && f.path.startsWith(`${oldPath}/`)
              ? f.path.slice(oldPath.length)
              : `/${f.name}`;
          return { ...f, path: `${newPath}${suffix}`, modifiedAt: new Date() };
        });
      }
      return next;
    });

    setSelectedFiles([]);
    setIsLoading(false);
    if (invalidTarget) {
      Alert.alert(
        'Déplacement impossible',
        'Vous ne pouvez pas déplacer un dossier dans lui-même ni dans un de ses sous-dossiers.',
      );
    }
    if (dupName) {
      Alert.alert('Conflit', 'Un élément du même nom existe déjà dans le dossier cible.');
    }
  };

  const uploadFileCore = async (
    file: UploadFileInput,
    parentId: string | null,
    cancelJobId?: string | null,
  ): Promise<FileItem> => {
    const throwIfCancelled = () => {
      if (cancelJobId && uploadAbortRef.current[cancelJobId]) {
        throw new Error(UPLOAD_CANCELLED);
      }
    };

    const deadline = Date.now() + 450;
    while (Date.now() < deadline) {
      throwIfCancelled();
      await new Promise((r) => setTimeout(r, 50));
    }
    throwIfCancelled();

    let localUri = file.uri;
    if (localUri) {
      localUri = (await persistUploadedLocalUri(localUri, file.name || 'fichier')) ?? localUri;
    }
    throwIfCancelled();

    let created: FileItem | null = null;
    setFiles((prev) => {
      const parentPath = parentId
        ? prev.find((f) => f.id === parentId && isActive(f))?.path || ''
        : '';
      const name = file.name || 'Nouveau fichier';
      const mimeType = file.mimeType || 'application/octet-stream';
      const newFile: FileItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        type: 'file',
        mimeType,
        size: file.size ?? 0,
        createdAt: new Date(),
        modifiedAt: new Date(),
        parentId,
        path: `${parentPath}/${name}`.replace(/\/+/g, '/'),
        ...(localUri
          ? {
              localUri,
              ...(mimeType.startsWith('image/') ? { thumbnail: localUri } : {}),
            }
          : {}),
      };
      created = newFile;
      return [...prev, newFile];
    });
    if (!created) throw new Error('upload failed');
    return created;
  };

  const uploadFile = async (
    file: UploadFileInput,
    parentId: string | null,
  ): Promise<FileItem> => {
    setIsLoading(true);
    try {
      return await uploadFileCore(file, parentId);
    } finally {
      setIsLoading(false);
    }
  };

  const bumpProgress = (jobId: string, value: number) => {
    setUploadJobs((jobs) =>
      jobs.map((j) => (j.id === jobId ? { ...j, progress: value } : j)),
    );
  };

  const enqueueUploadWithProgress = useCallback(
    async (file: UploadFileInput, parentId: string | null): Promise<FileItem | null> => {
      const jobId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      uploadAbortRef.current[jobId] = false;
      setUploadJobs((j) => [
        ...j,
        { id: jobId, name: file.name || 'Fichier', progress: 0, status: 'uploading' },
      ]);

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      try {
        for (let p = 5; p <= 88; p += 9) {
          if (uploadAbortRef.current[jobId]) {
            delete uploadAbortRef.current[jobId];
            setUploadJobs((jobs) => jobs.filter((x) => x.id !== jobId));
            return null;
          }
          bumpProgress(jobId, Math.min(p, 88));
          await sleep(120);
        }
        if (uploadAbortRef.current[jobId]) {
          delete uploadAbortRef.current[jobId];
          setUploadJobs((jobs) => jobs.filter((x) => x.id !== jobId));
          return null;
        }
        const created = await uploadFileCore(file, parentId, jobId);
        if (uploadAbortRef.current[jobId]) {
          const id = created.id;
          delete uploadAbortRef.current[jobId];
          setFiles((prev) => prev.filter((f) => f.id !== id));
          setUploadJobs((jobs) => jobs.filter((x) => x.id !== jobId));
          return null;
        }
        bumpProgress(jobId, 100);
        setUploadJobs((jobs) =>
          jobs.map((j) =>
            j.id === jobId ? { ...j, progress: 100, status: 'completed' as const } : j,
          ),
        );
        delete uploadAbortRef.current[jobId];
        return created;
      } catch (e) {
        if ((e as Error)?.message === UPLOAD_CANCELLED) {
          delete uploadAbortRef.current[jobId];
          setUploadJobs((jobs) => jobs.filter((x) => x.id !== jobId));
          return null;
        }
        setUploadJobs((jobs) =>
          jobs.map((j) => (j.id === jobId ? { ...j, status: 'failed' as const } : j)),
        );
        delete uploadAbortRef.current[jobId];
        return null;
      }
    },
    [],
  );

  const dismissCompletedUploads = () => {
    setUploadJobs((jobs) => jobs.filter((j) => j.status === 'uploading'));
  };

  const refreshCurrentFolder = useCallback(async () => {
    await refreshListing(currentFolder);
  }, [currentFolder, refreshListing]);

  const cancelUploadJob = (jobId: string) => {
    uploadAbortRef.current[jobId] = true;
    setUploadJobs((jobs) => jobs.filter((j) => j.id !== jobId));
  };

  const getFileById = (fileId: string) => {
    return files.find((f) => f.id === fileId && isActive(f));
  };

  const searchFiles = useCallback((query: string): FileItem[] => {
    const raw = query.trim().toLowerCase();
    if (raw.length < 2) return [];
    return files.filter((f) => {
      if (!isActive(f)) return false;
      const name = f.name.toLowerCase();
      const path = f.path.toLowerCase();
      if (name.includes(raw) || path.includes(raw)) return true;
      const extWithDot = lastExtensionLower(f.name);
      if (extWithDot) {
        const extNoDot = extWithDot.slice(1);
        if (extNoDot.includes(raw) || raw === extNoDot || raw === extWithDot) return true;
        if (raw.startsWith('.') && extWithDot === raw) return true;
      }
      return false;
    });
  }, [files]);

  const getTrashRoots = useCallback(() => trashRootItems(files), [files]);

  const restoreTrashGroup = async (trashRootId: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 250));
    setFiles((prev) => {
      const root = prev.find((f) => f.id === trashRootId);
      if (!root?.deleteGroupId) return prev;
      const gid = root.deleteGroupId;
      return prev.map((f) => {
        if (f.deleteGroupId !== gid) return f;
        const parentOk =
          !f.parentId ||
          prev.some(
            (p) =>
              p.id === f.parentId &&
              (isActive(p) || p.deleteGroupId === gid),
          );
        let next: FileItem = { ...f, deletedAt: undefined, deleteGroupId: undefined };
        if (!parentOk) {
          next = {
            ...next,
            parentId: null,
            path: buildPathForItem(null, next.name, prev),
            modifiedAt: new Date(),
          };
        }
        return next;
      });
    });
    setIsLoading(false);
  };

  const permanentlyDeleteTrashGroup = async (trashRootId: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 200));
    setFiles((prev) => {
      const root = prev.find((f) => f.id === trashRootId);
      if (!root?.deleteGroupId) return prev;
      const gid = root.deleteGroupId;
      return prev.filter((f) => f.deleteGroupId !== gid);
    });
    setIsLoading(false);
  };

  const emptyTrash = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    setFiles((prev) => prev.filter((f) => !f.deletedAt));
    setIsLoading(false);
  };

<<<<<<< Updated upstream
  const duplicateItem = async (itemId: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    setFiles((prev) => {
      const item = prev.find((f) => f.id === itemId && isActive(f));
      if (!item) return prev;
      const ids = collectSubtreeIds(item.id, prev);
      const sorted = [...ids]
        .map((id) => prev.find((f) => f.id === id)!)
        .sort((a, b) => a.path.length - b.path.length);

      const idMap = new Map<string, string>();
      const additions: FileItem[] = [];
      let merged: FileItem[] = [...prev];

      for (let i = 0; i < sorted.length; i++) {
        const node = sorted[i];
        const newId = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 11)}`;
        idMap.set(node.id, newId);
        const newParentId =
          node.id === item.id ? item.parentId : idMap.get(node.parentId!)!;
        const newName =
          node.id === item.id ? uniqueCopyName(item.name, item.parentId, merged) : node.name;
        const path = buildPathForItem(newParentId, newName, merged);
        const clone: FileItem = {
          ...node,
          id: newId,
          parentId: newParentId,
          name: newName,
          path,
          createdAt: new Date(),
          modifiedAt: new Date(),
          deletedAt: undefined,
          deleteGroupId: undefined,
        };
        additions.push(clone);
        merged = [...merged, clone];
      }
      return merged;
    });
    setIsLoading(false);
  };

=======
>>>>>>> Stashed changes
  const createPublicShareLink = useCallback(
    (opts: {
      targetId: string;
      targetType: 'file' | 'folder';
      password?: string | null;
      expiresInDays: number | null;
    }): ShareLink => {
      const token = randomShareToken();
      const url = `https://supfile.app/s/${token}`;
      let expiresAt: Date | undefined;
      if (opts.expiresInDays != null && opts.expiresInDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + opts.expiresInDays);
        expiresAt = d;
      }
      const pwd = opts.password?.trim();
      const link: ShareLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        targetId: opts.targetId,
        targetType: opts.targetType,
        token,
        url,
        ...(pwd ? { password: pwd } : {}),
        ...(expiresAt ? { expiresAt } : {}),
        createdAt: new Date(),
        downloads: 0,
      };
      setShareLinks((prev) => [link, ...prev]);
      return link;
    },
    [],
  );

  const revokePublicShareLink = useCallback((linkId: string) => {
    setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
  }, []);

  const inviteUserToFolder = useCallback(
    (folderId: string, recipientEmail: string) => {
      const trimmed = recipientEmail.trim();
      if (!trimmed.includes('@')) {
        Alert.alert('E-mail invalide', 'Saisissez une adresse e-mail valide.');
        return;
      }
      const folder = files.find((f) => f.id === folderId && isActive(f) && f.type === 'folder');
      if (!folder) {
        Alert.alert('Erreur', 'Dossier introuvable.');
        return;
      }
      Alert.alert(
        'Invitation envoyée',
        `Le dossier « ${folder.name} » sera proposé à la racine de l’espace de ${trimmed} lorsque ce contact acceptera l’invitation sur la plateforme.`,
      );
    },
    [files],
  );

  return (
    <FilesContext.Provider
      value={{
        files,
        currentFolder,
        selectedFiles,
        isLoading,
        breadcrumbs: getBreadcrumbs(),
        uploadJobs,
        navigateToFolder,
        getFilesInFolder,
        selectFile,
        deselectFile,
        clearSelection,
        toggleSelection,
        createFolder,
        renameItem,
        softDeleteItems,
        moveItems,
        uploadFile,
        enqueueUploadWithProgress,
        dismissCompletedUploads,
        refreshCurrentFolder,
        cancelUploadJob,
        getFileById,
        searchFiles,
        getTrashRoots,
        restoreTrashGroup,
        permanentlyDeleteTrashGroup,
        emptyTrash,
        shareLinks,
        incomingShares,
        createPublicShareLink,
        revokePublicShareLink,
        inviteUserToFolder,
      }}
    >
      {children}
    </FilesContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FilesContext);
  if (context === undefined) {
    throw new Error('useFiles must be used within a FilesProvider');
  }
  return context;
}

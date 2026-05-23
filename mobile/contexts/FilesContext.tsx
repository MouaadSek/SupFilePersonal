import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { FileItem, ShareLink, IncomingShareEntry } from '@/types';
import { isActive, excludedMoveTargetFolderIds, trashRootItems } from '@/utils/fileTree';
import { useAuth } from '@/contexts/AuthContext';
import {
  apiListRoot,
  apiListFolder,
  apiCreateFolder,
  apiUpdateFolder,
  apiTrashFolder,
  apiRestoreFolder,
  apiInviteFolderMember,
} from '@/services/api/folders';
import {
  apiUpdateFile,
  apiTrashFile,
  apiRestoreFile,
  apiGetFile,
  apiUploadFileWithProgress,
} from '@/services/api/files';
import { apiSearch } from '@/services/api/dashboard';
import {
  apiListShares,
  apiSharedWithMe,
  apiCreateShare,
  apiRevokeShare,
} from '@/services/api/shares';
import {
  apiListTrash,
  apiEmptyTrash,
  apiPurgeFile,
  apiPurgeFolder,
} from '@/services/api/trash';
import {
  mergeFolderListing,
  mapTrashListing,
  replaceTrashInCache,
} from '@/services/api/listing';
import {
  buildPath,
  mapApiFile,
  mapApiFolder,
  mapApiShare,
  mapIncomingShare,
} from '@/services/api/mappers';
import { ApiError } from '@/services/api/client';

function lastExtensionLower(filename: string): string | null {
  const i = filename.lastIndexOf('.');
  if (i <= 0) return null;
  return filename.slice(i).toLowerCase();
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
  softDeleteItems: (itemIds: string[]) => Promise<void>;
  moveItems: (itemIds: string[], targetFolderId: string | null) => Promise<void>;
  uploadFile: (file: UploadFileInput, parentId: string | null) => Promise<FileItem>;
  enqueueUploadWithProgress: (
    file: UploadFileInput,
    parentId: string | null,
  ) => Promise<FileItem | null>;
  dismissCompletedUploads: () => void;
  refreshCurrentFolder: () => Promise<void>;
  refreshRootListing: () => Promise<void>;
  refreshShares: () => Promise<void>;
  cancelUploadJob: (jobId: string) => void;
  getFileById: (fileId: string) => FileItem | undefined;
  ensureFileInIndex: (fileId: string) => Promise<FileItem | undefined>;
  /** Local filter on cached files (instant). */
  searchFiles: (query: string) => FileItem[];
  /** Server search (`GET /search`). */
  fetchSearchResults: (query: string) => Promise<FileItem[]>;
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
  }) => Promise<ShareLink>;
  revokePublicShareLink: (linkId: string) => void;
  inviteUserToFolder: (folderId: string, recipientEmail: string) => void;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

const UPLOAD_CANCELLED = 'UPLOAD_CANCELLED';

function showApiError(err: unknown, fallback: string) {
  const message = err instanceof ApiError ? err.message : fallback;
  Alert.alert('Erreur', message);
}

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

export function FilesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, refreshSession } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [incomingShares, setIncomingShares] = useState<IncomingShareEntry[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadJobs, setUploadJobs] = useState<UploadJobView[]>([]);
  const uploadAbortRef = useRef<Record<string, boolean>>({});
  const filesRef = useRef(files);
  filesRef.current = files;

  const fetchListing = useCallback(async (folderId: string | null) => {
    const listing = folderId ? await apiListFolder(folderId) : await apiListRoot();
    setFiles((prev) => mergeFolderListing(prev, listing));
    return listing;
  }, []);

  const loadTrash = useCallback(async () => {
    const trash = await apiListTrash();
    const trashed = mapTrashListing(trash);
    setFiles((prev) => replaceTrashInCache(prev, trashed));
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      setFiles([]);
      setShareLinks([]);
      setIncomingShares([]);
      setCurrentFolder(null);
      setSelectedFiles([]);
      return;
    }
    void (async () => {
      setIsLoading(true);
      try {
        await fetchListing(null);
      } catch (err) {
        showApiError(err, 'Impossible de charger vos fichiers.');
      }
      try {
        await loadTrash();
      } catch {
        /* corbeille optionnelle — ne bloque pas la connexion */
      }
      try {
        const [links, incoming] = await Promise.all([apiListShares(), apiSharedWithMe()]);
        setShareLinks(links.map(mapApiShare));
        setIncomingShares(incoming.map(mapIncomingShare));
      } catch {
        /* partages optionnels au premier chargement */
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isAuthenticated, isInitializing, fetchListing, loadTrash]);

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
    const hasChildren = files.some((x) => isActive(x) && x.parentId === folderId);
    if (!hasChildren) {
      void fetchListing(folderId).catch(() => {
        /* refresh on next focus */
      });
    }
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

  const clearSelection = () => setSelectedFiles([]);

  const toggleSelection = (fileId: string) => {
    if (selectedFiles.includes(fileId)) deselectFile(fileId);
    else selectFile(fileId);
  };

  const createFolder = async (name: string, parentId: string | null): Promise<FileItem> => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Dossier', 'Le nom du dossier ne peut pas être vide.');
      throw new Error('createFolder failed');
    }
    setIsLoading(true);
    try {
      const apiFolder = await apiCreateFolder(trimmed, parentId);
      const parentPath = parentId
        ? filesRef.current.find((f) => f.id === parentId && isActive(f))?.path ?? ''
        : '';
      const item = mapApiFolder(apiFolder, buildPath(parentPath || null, apiFolder.name));
      setFiles((prev) => [...prev.filter((f) => f.id !== item.id), item]);
      return item;
    } catch (err) {
      showApiError(err, 'Impossible de créer le dossier.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const renameItem = async (itemId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const item = filesRef.current.find((f) => f.id === itemId && isActive(f));
    if (!item || item.name === trimmed) return;

    if (item.type === 'file') {
      const origExt = lastExtensionLower(item.name);
      if (origExt && lastExtensionLower(trimmed) !== origExt) {
        Alert.alert(
          'Extension obligatoire',
          'Vous ne pouvez pas modifier ou supprimer l’extension de ce fichier.',
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      if (item.type === 'folder') {
        await apiUpdateFolder(itemId, { name: trimmed });
      } else {
        await apiUpdateFile(itemId, { name: trimmed });
      }
      await fetchListing(currentFolder);
    } catch (err) {
      showApiError(err, 'Impossible de renommer cet élément.');
    } finally {
      setIsLoading(false);
    }
  };

  const softDeleteItems = async (itemIds: string[]) => {
    setIsLoading(true);
    try {
      for (const id of itemIds) {
        const node = filesRef.current.find((f) => f.id === id && isActive(f));
        if (!node) continue;
        if (node.type === 'folder') await apiTrashFolder(id);
        else await apiTrashFile(id);
      }
      await fetchListing(currentFolder);
      await loadTrash();
      void refreshSession().catch(() => {});
      setSelectedFiles([]);
    } catch (err) {
      showApiError(err, 'Impossible de mettre à la corbeille.');
    } finally {
      setIsLoading(false);
    }
  };

  const moveItems = async (itemIds: string[], targetFolderId: string | null) => {
    const ex = excludedMoveTargetFolderIds(itemIds, filesRef.current);
    if (targetFolderId && ex.has(targetFolderId)) {
      Alert.alert(
        'Déplacement impossible',
        'Vous ne pouvez pas déplacer un dossier dans lui-même ni dans un de ses sous-dossiers.',
      );
      return;
    }

    setIsLoading(true);
    try {
      for (const id of itemIds) {
        const node = filesRef.current.find((f) => f.id === id && isActive(f));
        if (!node) continue;
        if (node.type === 'folder') {
          await apiUpdateFolder(id, { parent_id: targetFolderId });
        } else {
          await apiUpdateFile(id, { folder_id: targetFolderId });
        }
      }
      await fetchListing(currentFolder);
      setSelectedFiles([]);
    } catch (err) {
      showApiError(err, 'Impossible de déplacer cet élément.');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFileCore = async (
    file: UploadFileInput,
    parentId: string | null,
    jobId?: string,
  ): Promise<FileItem> => {
    if (!file.uri) {
      throw new Error('Missing file URI');
    }
    const localUri =
      (await persistUploadedLocalUri(file.uri, file.name || 'fichier')) ?? file.uri;

    const apiFile = await apiUploadFileWithProgress(
      localUri,
      file.name || 'Nouveau fichier',
      file.mimeType || 'application/octet-stream',
      parentId,
      jobId
        ? (pct) => {
            setUploadJobs((jobs) =>
              jobs.map((j) => (j.id === jobId ? { ...j, progress: pct } : j)),
            );
          }
        : undefined,
      jobId ? () => !!uploadAbortRef.current[jobId] : undefined,
    );

    if (jobId && uploadAbortRef.current[jobId]) {
      throw new Error(UPLOAD_CANCELLED);
    }

    const parentPath = parentId
      ? filesRef.current.find((f) => f.id === parentId && isActive(f))?.path ?? ''
      : '';
    const mapped = mapApiFile(apiFile, buildPath(parentPath || null, apiFile.name));
    const mime = mapped.mimeType || '';
    const withLocal: FileItem = {
      ...mapped,
      ...(localUri
        ? {
            localUri,
            ...(mime.startsWith('image/') ? { thumbnail: localUri } : {}),
          }
        : {}),
    };
    setFiles((prev) => [...prev.filter((f) => f.id !== withLocal.id), withLocal]);
    void refreshSession().catch(() => {});
    return withLocal;
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

  const enqueueUploadWithProgress = useCallback(
    async (file: UploadFileInput, parentId: string | null): Promise<FileItem | null> => {
      const jobId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      uploadAbortRef.current[jobId] = false;
      setUploadJobs((j) => [
        ...j,
        { id: jobId, name: file.name || 'Fichier', progress: 0, status: 'uploading' },
      ]);

      try {
        const created = await uploadFileCore(file, parentId, jobId);
        if (uploadAbortRef.current[jobId]) {
          delete uploadAbortRef.current[jobId];
          setUploadJobs((jobs) => jobs.filter((x) => x.id !== jobId));
          return null;
        }
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
        showApiError(e, 'Échec de l’import.');
        return null;
      }
    },
    [],
  );

  const dismissCompletedUploads = () => {
    setUploadJobs((jobs) => jobs.filter((j) => j.status === 'uploading'));
  };

  const refreshCurrentFolder = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      await fetchListing(currentFolder);
    } catch (err) {
      showApiError(err, 'Impossible d’actualiser le dossier.');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder, fetchListing, isAuthenticated]);

  const refreshRootListing = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await fetchListing(null);
    } catch {
      /* silencieux — rafraîchissement depuis l’accueil */
    }
  }, [fetchListing, isAuthenticated]);

  const refreshShares = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [links, incoming] = await Promise.all([apiListShares(), apiSharedWithMe()]);
      setShareLinks(links.map(mapApiShare));
      setIncomingShares(incoming.map(mapIncomingShare));
    } catch (err) {
      showApiError(err, 'Impossible de charger les partages.');
    }
  }, [isAuthenticated]);

  const cancelUploadJob = (jobId: string) => {
    uploadAbortRef.current[jobId] = true;
    setUploadJobs((jobs) => jobs.filter((j) => j.id !== jobId));
  };

  const getFileById = (fileId: string) => {
    return files.find((f) => f.id === fileId && isActive(f));
  };

  const ensureFileInIndex = useCallback(async (fileId: string): Promise<FileItem | undefined> => {
    const existing = filesRef.current.find((f) => f.id === fileId && isActive(f));
    if (existing) return existing;
    try {
      const apiFile = await apiGetFile(fileId);
      const parentPath = apiFile.folder_id
        ? filesRef.current.find((f) => f.id === apiFile.folder_id)?.path ?? ''
        : '';
      const item = mapApiFile(apiFile, buildPath(parentPath || null, apiFile.name));
      setFiles((prev) => [...prev.filter((f) => f.id !== item.id), item]);
      return item;
    } catch {
      return undefined;
    }
  }, []);

  const searchFiles = useCallback(
    (query: string): FileItem[] => {
      const raw = query.trim().toLowerCase();
      if (raw.length < 2) return [];
      return filesRef.current.filter((f) => {
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
    },
    [files],
  );

  const fetchSearchResults = useCallback(async (query: string): Promise<FileItem[]> => {
    const raw = query.trim();
    if (raw.length < 2) return [];
    const { files: fileRows, folders: folderRows } = await apiSearch({ q: raw });
    const folderItems = folderRows.map((folder) => {
      const parentPath = folder.parent_id
        ? filesRef.current.find((x) => x.id === folder.parent_id)?.path ?? ''
        : '';
      return mapApiFolder(folder, buildPath(parentPath || null, folder.name));
    });
    const fileItems = fileRows.map((f) => {
      const parentPath = f.folder_id
        ? filesRef.current.find((x) => x.id === f.folder_id)?.path ?? ''
        : '';
      return mapApiFile(f, buildPath(parentPath || null, f.name));
    });
    return [...folderItems, ...fileItems];
  }, []);

  const getTrashRoots = useCallback(() => trashRootItems(files), [files]);

  const restoreTrashGroup = async (trashRootId: string) => {
    setIsLoading(true);
    try {
      const root = filesRef.current.find((f) => f.id === trashRootId);
      if (!root) return;
      if (root.type === 'folder') await apiRestoreFolder(trashRootId);
      else await apiRestoreFile(trashRootId);
      await Promise.all([fetchListing(currentFolder), loadTrash()]);
    } catch (err) {
      showApiError(err, 'Impossible de restaurer.');
    } finally {
      setIsLoading(false);
    }
  };

  const permanentlyDeleteTrashGroup = async (trashRootId: string) => {
    setIsLoading(true);
    try {
      const root = filesRef.current.find((f) => f.id === trashRootId);
      if (!root) return;
      if (root.type === 'folder') await apiPurgeFolder(trashRootId);
      else await apiPurgeFile(trashRootId);
      await loadTrash();
    } catch (err) {
      showApiError(err, 'Impossible de supprimer définitivement.');
    } finally {
      setIsLoading(false);
    }
  };

  const emptyTrash = async () => {
    setIsLoading(true);
    try {
      await apiEmptyTrash();
      setFiles((prev) => prev.filter((f) => !f.deletedAt));
    } catch (err) {
      showApiError(err, 'Impossible de vider la corbeille.');
    } finally {
      setIsLoading(false);
    }
  };

  const createPublicShareLink = useCallback(
    async (opts: {
      targetId: string;
      targetType: 'file' | 'folder';
      password?: string | null;
      expiresInDays: number | null;
    }): Promise<ShareLink> => {
      let expires_at: string | null = null;
      if (opts.expiresInDays != null && opts.expiresInDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + opts.expiresInDays);
        expires_at = d.toISOString();
      }
      const pwd = opts.password?.trim();
      const body = {
        ...(opts.targetType === 'file'
          ? { file_id: opts.targetId }
          : { folder_id: opts.targetId }),
        expires_at,
        ...(pwd ? { password: pwd } : {}),
      };
      const created = await apiCreateShare(body);
      const link = mapApiShare(created);
      setShareLinks((prev) => [link, ...prev]);
      return link;
    },
    [],
  );

  const revokePublicShareLink = useCallback((linkId: string) => {
    void (async () => {
      try {
        await apiRevokeShare(linkId);
        setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
      } catch (err) {
        showApiError(err, 'Impossible de supprimer le lien.');
      }
    })();
  }, []);

  const inviteUserToFolder = useCallback((folderId: string, recipientEmail: string) => {
    const trimmed = recipientEmail.trim();
    if (!trimmed.includes('@')) {
      Alert.alert('E-mail invalide', 'Saisissez une adresse e-mail valide.');
      return;
    }
    void (async () => {
      try {
        await apiInviteFolderMember(folderId, trimmed);
        const folder = filesRef.current.find(
          (f) => f.id === folderId && isActive(f) && f.type === 'folder',
        );
        Alert.alert(
          'Invitation envoyée',
          folder
            ? `Le dossier « ${folder.name} » a été partagé avec ${trimmed}.`
            : `Invitation envoyée à ${trimmed}.`,
        );
      } catch (err) {
        showApiError(err, 'Impossible d’envoyer l’invitation.');
      }
    })();
  }, []);

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
        refreshRootListing,
        refreshShares,
        cancelUploadJob,
        getFileById,
        ensureFileInIndex,
        searchFiles,
        fetchSearchResults,
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

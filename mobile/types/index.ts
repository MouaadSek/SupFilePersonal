export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  storageUsed: number;
  storageLimit: number;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  createdAt: Date;
  modifiedAt: Date;
  parentId: string | null;
  path: string;
  /** Device or cache URI before the backend returns a permanent URL */
  localUri?: string;
  isStarred?: boolean;
  isShared?: boolean;
  sharedWith?: string[];
  thumbnail?: string;
  /** URL signée ou publique pour télécharger puis ouvrir avec une app externe */
  downloadUrl?: string;
  /** URL de prévisualisation (stream / inline) */
  previewUrl?: string;
  /** Nombre d’éléments dans un dossier (API) */
  itemCount?: number;
  /** Présent si l’élément est à la corbeille (suppression douce) */
  deletedAt?: Date;
  /** Regroupe les nœuds supprimés ensemble (ex. dossier + contenu) */
  deleteGroupId?: string;
  /** true when this item descends from a folder shared *to* the current user
   *  (i.e. they're a folder_member, not the owner). Used by the action menu
   *  to hide owner-only actions (rename / delete / move). */
  shared?: boolean;
  /** Caller's effective permission on a shared folder/file ('read' | 'write').
   *  Undefined for owned items. */
  permission?: 'read' | 'write';
}

export interface ShareLink {
  id: string;
  /** Fichier ou dossier concerné par le lien public */
  targetId: string;
  targetType: 'file' | 'folder';
  /** Segment d’URL unique (démo sans backend) */
  token: string;
  url: string;
  password?: string;
  /** Absent ou `undefined` = pas d’expiration */
  expiresAt?: Date;
  createdAt: Date;
  downloads: number;
}

/** Élément reçu d’un autre utilisateur (racine de son espace → le vôtre, spec 2.2.4) */
export interface IncomingShareEntry {
  id: string;
  itemType: 'file' | 'folder';
  name: string;
  ownerLabel: string;
  sharedAt: Date;
}

export interface Activity {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'share' | 'move' | 'rename';
  fileId: string;
  fileName: string;
  timestamp: Date;
}

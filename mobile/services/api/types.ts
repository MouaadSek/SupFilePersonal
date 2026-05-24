export type ApiUser = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  quota_used: number;
  quota_total: number;
  theme?: 'light' | 'dark' | 'system';
  created_at?: string;
};

export type ApiFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  trashed?: boolean;
  created_at: string;
  updated_at: string;
  /** Direct children (subfolders + files), from API */
  item_count?: number;
  /** Server marks this true on root-level shared folders + every descendant
   *  returned via listFolder when the caller is a folder_member, not the owner. */
  shared?: boolean;
  /** Caller's effective folder_members.permission on a shared folder. */
  permission?: 'read' | 'write' | null;
};

export type ApiFile = {
  id: string;
  name: string;
  folder_id: string | null;
  owner_id: string;
  mime_type: string;
  size: number;
  trashed?: boolean;
  created_at: string;
  updated_at: string;
  /** Stamped by listFolder when the parent folder is shared with the caller. */
  shared?: boolean;
  permission?: 'read' | 'write' | null;
};

export type ApiShare = {
  id: string;
  token: string;
  file_id?: string | null;
  folder_id?: string | null;
  expires_at?: string | null;
  password_protected?: boolean;
  created_at: string;
  file_name?: string | null;
  folder_name?: string | null;
};

export type ApiIncomingShare = {
  id: string;
  name: string;
  owner_id: string;
  permission: string;
  created_at: string;
  shared_by_name?: string;
  shared_by_email?: string;
};

export type ApiStorageBreakdown = {
  category: string;
  count?: number;
  total_size?: string | number;
  /** Legacy field name */
  size?: string | number;
};

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { getApiBase } from '@/lib/apiBase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserResult {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
}

interface SharingEntry {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string | null;
  folder_id: string;
  folder_name: string;
  permission: 'read' | 'write';
}

interface Folder {
  id: string;
  name: string;
}

interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  size: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const mb = bytes / 1_048_576;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('supfile_token') ?? '') : '';
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 dark:bg-slate-700/60 ${className}`} />;
}

function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 rounded-xl text-white text-sm font-medium
                    shadow-lg px-5 py-3 flex items-center gap-2 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {type === 'error' ? '✗' : '✓'} {message}
    </div>
  );
}

function UserAvatar({ user, size = 10 }: { user: Pick<UserResult, 'display_name' | 'avatar_url'>; size?: number }) {
  const [err, setErr] = useState(false);
  const sClass = `w-${size} h-${size}`;
  if (user.avatar_url && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${getApiBase().replace('/api', '')}${user.avatar_url}`}
        alt={user.display_name}
        className={`${sClass} rounded-full object-cover shrink-0`}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className={`${sClass} rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold text-sm shrink-0`}>
      {user.display_name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

// ─── Share Folder Modal ───────────────────────────────────────────────────────

function ShareFolderModal({
  targetUser,
  onClose,
  onShared,
}: {
  targetUser: UserResult;
  onClose: () => void;
  onShared: () => void;
}) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [permission, setPermission] = useState<'read' | 'write'>('read');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/folders')
      .then((res) => {
        const owned = (res.data.folders ?? []).filter((f: Folder & { shared?: boolean }) => !f.shared);
        setFolders(owned);
      })
      .finally(() => setLoadingFolders(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFolder) { setError('Select a folder first.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/folders/${selectedFolder.id}/members`, {
        user_id: targetUser.id,
        permission,
      });
      onShared();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to share folder.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-slate-dark dark:text-slate-100 mb-1">Share a folder</h3>
        <p className="text-sm text-slate-mid dark:text-slate-400 mb-5">
          Give <span className="font-medium text-slate-dark dark:text-slate-100">{targetUser.display_name}</span> access to one of your folders.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">Choose folder</label>
            {loadingFolders ? (
              <Skeleton className="h-10 w-full" />
            ) : folders.length === 0 ? (
              <p className="text-sm text-slate-mid dark:text-slate-400">You have no folders to share.</p>
            ) : (
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-light dark:border-slate-600
                           bg-white dark:bg-slate-700 text-sm text-slate-dark dark:text-slate-100
                           focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                value={selectedFolder?.id ?? ''}
                onChange={(e) => {
                  const f = folders.find(x => x.id === e.target.value) ?? null;
                  setSelectedFolder(f);
                }}
              >
                <option value="">Select a folder…</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">Permission</label>
            <div className="flex gap-3">
              {(['read', 'write'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPermission(p)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${
                    permission === p
                      ? 'bg-brand text-white border-brand'
                      : 'border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400 hover:border-brand hover:text-brand'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark dark:hover:text-slate-100 transition">
              Cancel
            </button>
            <button type="submit" disabled={!selectedFolder || submitting || folders.length === 0}
              className="px-4 py-2 text-sm bg-brand text-white rounded-xl hover:bg-brand-light transition disabled:opacity-50">
              {submitting ? 'Sharing…' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Send Files Modal ─────────────────────────────────────────────────────────

function SendFilesModal({
  targetUser,
  onClose,
  onSent,
}: {
  targetUser: UserResult;
  onClose: () => void;
  onSent: () => void;
}) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/folders')
      .then((res) => setFiles(res.data.files ?? []))
      .finally(() => setLoadingFiles(false));
  }, []);

  function toggleFile(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) { setError('Select at least one file.'); return; }
    setSubmitting(true);
    setError('');
    try {
      // 1. Create a new shared folder
      const folderRes = await api.post('/folders', {
        name: `Shared with ${targetUser.display_name}`,
      });
      const newFolderId: string = folderRes.data.id;

      // 2. Share the folder with the target user
      await api.post(`/folders/${newFolderId}/members`, {
        user_id: targetUser.id,
        permission: 'read',
      });

      // 3. Move the selected files into the new folder
      await Promise.all(
        Array.from(selectedIds).map((fileId) =>
          api.patch(`/files/${fileId}`, { folder_id: newFolderId })
        )
      );

      onSent();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to send files.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-slate-dark dark:text-slate-100 mb-1">Send files</h3>
        <p className="text-sm text-slate-mid dark:text-slate-400 mb-5">
          Select files from your storage to share with{' '}
          <span className="font-medium text-slate-dark dark:text-slate-100">{targetUser.display_name}</span>.
          A new shared folder will be created for them.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
              Files at root level
            </label>
            {loadingFiles ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : files.length === 0 ? (
              <p className="text-sm text-slate-mid dark:text-slate-400">No files available at root level.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-light dark:border-slate-700 rounded-xl p-2">
                {files.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-brand-bg dark:hover:bg-slate-700 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(f.id)}
                      onChange={() => toggleFile(f.id)}
                      className="w-4 h-4 accent-brand cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{f.name}</p>
                      <p className="text-xs text-slate-mid dark:text-slate-400">{formatBytes(f.size)}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark dark:hover:text-slate-100 transition">
              Cancel
            </button>
            <button type="submit" disabled={selectedIds.size === 0 || submitting}
              className="px-4 py-2 text-sm bg-brand text-white rounded-xl hover:bg-brand-light transition disabled:opacity-50">
              {submitting ? 'Sending…' : `Send ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const { user, loading: authLoading, logout } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [shareFolderTarget, setShareFolderTarget] = useState<UserResult | null>(null);
  const [sendFilesTarget,   setSendFilesTarget]   = useState<UserResult | null>(null);

  const [sharedByMe,   setSharedByMe]   = useState<SharingEntry[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharingEntry[]>([]);
  const [loadingSharing, setLoadingSharing] = useState(true);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadSharing = useCallback(() => {
    setLoadingSharing(true);
    api.get('/users/sharing')
      .then((res) => {
        setSharedByMe(res.data.shared_by_me ?? []);
        setSharedWithMe(res.data.shared_with_me ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingSharing(false));
  }, []);

  useEffect(() => { loadSharing(); }, [loadSharing]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      api.get(`/users/search?q=${encodeURIComponent(val.trim())}`)
        .then((res) => { setResults(res.data ?? []); setHasSearched(true); })
        .catch(() => { showToast('Search failed.', 'error'); })
        .finally(() => setSearching(false));
    }, 350);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // Deduplicate sharing summaries: group by user id
  function groupByUser(entries: SharingEntry[]) {
    const map = new Map<string, { user: Pick<SharingEntry, 'id' | 'display_name' | 'email' | 'avatar_url'>; folders: { id: string; name: string; permission: string }[] }>();
    for (const e of entries) {
      if (!map.has(e.id)) {
        map.set(e.id, { user: { id: e.id, display_name: e.display_name, email: e.email, avatar_url: e.avatar_url }, folders: [] });
      }
      map.get(e.id)!.folders.push({ id: e.folder_id, name: e.folder_name, permission: e.permission });
    }
    return Array.from(map.values());
  }

  const sharedByMeGroups   = groupByUser(sharedByMe);
  const sharedWithMeGroups = groupByUser(sharedWithMe);

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">People</h1>
          <p className="text-sm text-slate-mid dark:text-slate-400 mt-1">
            Find users and share files or folders with them.
          </p>
        </div>

        {/* Search bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-5 mb-6">
          <label className="block text-sm font-semibold text-slate-dark dark:text-slate-100 mb-3">
            Search users
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-mid dark:text-slate-400 pointer-events-none">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-light dark:border-slate-600
                         bg-brand-bg dark:bg-slate-700 text-sm text-slate-dark dark:text-slate-100
                         placeholder-slate-mid dark:placeholder-slate-400
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              </div>
            )}
          </div>

          {/* Results */}
          {hasSearched && (
            <div className="mt-3">
              {results.length === 0 ? (
                <p className="text-sm text-slate-mid dark:text-slate-400 py-2 text-center">No users found.</p>
              ) : (
                <div className="space-y-2">
                  {results.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-light dark:border-slate-700 bg-brand-bg/50 dark:bg-slate-700/30"
                    >
                      <UserAvatar user={u} size={10} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">
                          {u.display_name}
                        </p>
                        <p className="text-xs text-slate-mid dark:text-slate-400 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setShareFolderTarget(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                     border border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400
                                     hover:border-brand hover:text-brand transition"
                          title="Share a folder with this user"
                        >
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                          </svg>
                          Share folder
                        </button>
                        <button
                          onClick={() => setSendFilesTarget(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                     bg-brand text-white hover:bg-brand-light transition"
                          title="Send files to this user"
                        >
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                          Send files
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shared with section */}
        <div className="space-y-5">
          {/* Folders I've shared */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-dark dark:text-slate-100 mb-4 flex items-center gap-2">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className="text-brand">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
              </svg>
              Shared by me
              {!loadingSharing && sharedByMeGroups.length > 0 && (
                <span className="ml-auto text-xs text-slate-mid dark:text-slate-500 font-normal">
                  {sharedByMeGroups.length} {sharedByMeGroups.length === 1 ? 'person' : 'people'}
                </span>
              )}
            </h2>

            {loadingSharing ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : sharedByMeGroups.length === 0 ? (
              <p className="text-sm text-slate-mid dark:text-slate-400 text-center py-4">
                You haven&apos;t shared any folders yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sharedByMeGroups.map(({ user: u, folders }) => (
                  <div key={u.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-light dark:border-slate-700 bg-brand-bg/30 dark:bg-slate-700/20">
                    <UserAvatar user={u} size={9} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{u.display_name}</p>
                      <p className="text-xs text-slate-mid dark:text-slate-400 truncate mb-1.5">{u.email}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {folders.map((f) => (
                          <span key={f.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                                       bg-brand/10 text-brand dark:bg-brand/20">
                            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                            {f.name}
                            <span className="opacity-60">· {f.permission}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Folders shared with me */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-dark dark:text-slate-100 mb-4 flex items-center gap-2">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className="text-slate-mid">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Shared with me
              {!loadingSharing && sharedWithMeGroups.length > 0 && (
                <span className="ml-auto text-xs text-slate-mid dark:text-slate-500 font-normal">
                  {sharedWithMeGroups.length} {sharedWithMeGroups.length === 1 ? 'person' : 'people'}
                </span>
              )}
            </h2>

            {loadingSharing ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : sharedWithMeGroups.length === 0 ? (
              <p className="text-sm text-slate-mid dark:text-slate-400 text-center py-4">
                No one has shared folders with you yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sharedWithMeGroups.map(({ user: u, folders }) => (
                  <div key={u.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-light dark:border-slate-700 bg-brand-bg/30 dark:bg-slate-700/20">
                    <UserAvatar user={u} size={9} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{u.display_name}</p>
                      <p className="text-xs text-slate-mid dark:text-slate-400 truncate mb-1.5">{u.email}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {folders.map((f) => (
                          <span key={f.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                                       bg-slate-light/60 dark:bg-slate-700 text-slate-mid dark:text-slate-400">
                            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                            {f.name}
                            <span className="opacity-60">· {f.permission}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Modals ── */}
      {shareFolderTarget && (
        <ShareFolderModal
          targetUser={shareFolderTarget}
          onClose={() => setShareFolderTarget(null)}
          onShared={() => {
            showToast(`Folder shared with ${shareFolderTarget.display_name}!`);
            loadSharing();
          }}
        />
      )}

      {sendFilesTarget && (
        <SendFilesModal
          targetUser={sendFilesTarget}
          onClose={() => setSendFilesTarget(null)}
          onSent={() => {
            showToast(`Files sent to ${sendFilesTarget.display_name}!`);
            loadSharing();
          }}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </DashboardLayout>
  );
}

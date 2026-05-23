'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { IconShare, IconFolder, IconFile, IconTrash } from '@/components/icons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShareLink {
  id: string;
  token: string;
  file_id: string | null;
  folder_id: string | null;
  file_name: string | null;
  folder_name: string | null;
  password_protected: boolean;
  expires_at: string | null;
  created_at: string;
}

interface SharedFolder {
  id: string;
  name: string;
  owner_id: string;
  permission: 'read' | 'write';
  shared_by_name: string;
  shared_by_email: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1)  return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isExpired(iso: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function expiryLabel(iso: string | null) {
  if (!iso) return 'Never expires';
  if (isExpired(iso)) return 'Expired';
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return d === 1 ? 'Expires tomorrow' : `Expires in ${d} days`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 dark:bg-slate-700/60 ${className}`} />;
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-green-500 dark:bg-green-600 text-white
                    text-sm font-medium shadow-lg flex items-center gap-2">
      ✓ {message}
    </div>
  );
}

// ─── Create link modal (file/folder picker) ───────────────────────────────────

function CreateLinkModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [items, setItems]       = useState<{ id: string; name: string; type: 'file' | 'folder' }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [expiry,   setExpiry]   = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    api.get('/folders').then((res) => {
      const folders = (res.data.folders ?? []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name, type: 'folder' as const }));
      const files   = (res.data.files   ?? []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name, type: 'file'   as const }));
      setItems([...folders, ...files]);
    }).finally(() => setLoadingItems(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError('Select a file or folder first.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/shares', {
        [selected.type === 'file' ? 'file_id' : 'folder_id']: selected.id,
        expires_at: expiry   || null,
        password:   password || null,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-slate-dark dark:text-slate-100 text-lg mb-1">Create public link</h3>
        <p className="text-sm text-slate-mid dark:text-slate-400 mb-5">Choose a file or folder to share publicly.</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-300 mb-1.5">
              Select file or folder
            </label>
            {loadingItems ? (
              <div className="h-40 rounded-xl bg-slate-light/40 dark:bg-slate-700/40 animate-pulse" />
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-light dark:border-slate-600 divide-y divide-slate-light/60 dark:divide-slate-700">
                {items.length === 0 ? (
                  <p className="text-sm text-slate-mid dark:text-slate-400 p-4 text-center">No files or folders found.</p>
                ) : items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(selected?.id === item.id ? null : item)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left transition cursor-pointer ${
                      selected?.id === item.id
                        ? 'bg-brand/10 dark:bg-brand/20'
                        : 'hover:bg-brand-bg dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={item.type === 'folder' ? 'text-brand' : 'text-slate-mid dark:text-slate-400'}>
                      {item.type === 'folder' ? <IconFolder /> : <IconFile />}
                    </span>
                    <span className={`flex-1 truncate ${selected?.id === item.id ? 'text-brand font-medium' : 'text-slate-dark dark:text-slate-100'}`}>
                      {item.name}
                    </span>
                    {selected?.id === item.id && <span className="text-brand text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-300 mb-1.5">
              Expires at <span className="text-slate-mid font-normal">(optional)</span>
            </label>
            <input type="datetime-local" className="input-field" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-300 mb-1.5">
              Password <span className="text-slate-mid font-normal">(optional)</span>
            </label>
            <input type="password" className="input-field" placeholder="Leave empty for public access" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-mid dark:text-slate-400 hover:text-slate-dark dark:hover:text-slate-100 transition cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading || !selected}
              className="px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-light transition disabled:opacity-50 cursor-pointer">
              {loading ? 'Creating…' : 'Create link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab button ──────────────────────────────────────────────────────────────

function Tab({ label, active, count, onClick }: {
  label: string; active: boolean; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
        active ? 'bg-brand text-white shadow-sm' : 'text-slate-mid dark:text-slate-400 hover:text-slate-dark dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700'
      }`}
    >
      {label}
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
        active ? 'bg-white/20 text-white' : 'bg-slate-light/60 dark:bg-slate-600 text-slate-mid dark:text-slate-300'
      }`}>
        {count}
      </span>
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SharedPage() {
  const { user, loading: authLoading, logout } = useAuth();

  const [tab,         setTab]         = useState<'links' | 'withme'>('links');
  const [links,       setLinks]       = useState<ShareLink[]>([]);
  const [withMe,      setWithMe]      = useState<SharedFolder[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [toast,       setToast]       = useState('');
  const [copied,      setCopied]      = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [linksRes, withMeRes] = await Promise.all([
        api.get('/shares'),
        api.get('/shares/with-me'),
      ]);
      setLinks(linksRes.data);
      setWithMe(withMeRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    showToast('Link copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  }

  async function revoke(id: string) {
    await api.delete(`/shares/${id}`);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    showToast('Link revoked.');
  }

  async function leaveFolder(folderId: string) {
    if (!user?.id) return;
    try {
      await api.delete(`/folders/${folderId}/members/${user.id}`);
      setWithMe((prev) => prev.filter((f) => f.id !== folderId));
      showToast('Left shared folder.');
    } catch {
      showToast('Failed to leave folder.');
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Shared</h1>
          <p className="text-sm text-slate-mid dark:text-slate-400 mt-1">Manage your public links and folders shared with you.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm
                     font-medium rounded-xl hover:bg-brand-light transition cursor-pointer"
        >
          <IconShare /> New link
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 mb-6 bg-brand-bg/60 dark:bg-slate-700/60 rounded-2xl p-1.5 w-fit">
        <Tab label="My links"       active={tab === 'links'}  count={links.length}  onClick={() => setTab('links')} />
        <Tab label="Shared with me" active={tab === 'withme'} count={withMe.length} onClick={() => setTab('withme')} />
      </div>

      {/* ── My links tab ── */}
      {tab === 'links' && (
        loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-brand-bg dark:bg-slate-700 flex items-center justify-center mb-4 text-brand">
              <IconShare />
            </div>
            <p className="text-slate-dark dark:text-slate-100 font-semibold text-lg">No public links yet</p>
            <p className="text-slate-mid dark:text-slate-400 text-sm mt-1 mb-6">Create a link to share files or folders with anyone.</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl
                         text-sm font-medium hover:bg-brand-light transition cursor-pointer">
              <IconShare /> Create first link
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
            {links.map((link, i) => {
              const expired  = isExpired(link.expires_at);
              const name     = link.file_name ?? link.folder_name ?? 'Unknown';
              const isFolder = !!link.folder_id;
              const publicUrl = `${window.location.origin}/share/${link.token}`;

              return (
                <div
                  key={link.id}
                  className={`flex items-center gap-4 px-5 py-4 group transition hover:bg-brand-bg/40 dark:hover:bg-slate-700/40
                              ${i !== links.length - 1 ? 'border-b border-slate-light/60 dark:border-slate-700/60' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                   ${expired ? 'bg-slate-light/40 dark:bg-slate-700 text-slate-mid dark:text-slate-400' : 'bg-brand/10 text-brand'}`}>
                    {isFolder ? <IconFolder /> : <IconFile />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{name}</p>
                      {link.password_protected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-light/60 dark:bg-slate-700 text-slate-mid dark:text-slate-300">
                          🔒 password
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        expired
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                          : link.expires_at
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      }`}>
                        {expiryLabel(link.expires_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-mid dark:text-slate-400 mt-0.5 truncate font-mono">{publicUrl}</p>
                    <p className="text-xs text-slate-mid dark:text-slate-500 mt-0.5">Created {timeAgo(link.created_at)}</p>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => copyLink(link.token)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium cursor-pointer ${
                        copied === link.token
                          ? 'border-green-400 text-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-brand text-brand hover:bg-brand hover:text-white'
                      }`}
                    >
                      {copied === link.token ? 'Copied!' : 'Copy link'}
                    </button>
                    <a
                      href={`${window.location.origin}/share/${link.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400
                                 hover:border-brand hover:text-brand transition"
                    >
                      Open
                    </a>
                    <button
                      onClick={() => revoke(link.id)}
                      className="text-slate-mid dark:text-slate-400 hover:text-red-500 transition p-1 cursor-pointer"
                      aria-label="Revoke link"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Shared with me tab ── */}
      {tab === 'withme' && (
        loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : withMe.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-brand-bg dark:bg-slate-700 flex items-center justify-center mb-4 text-slate-mid dark:text-slate-400">
              <IconFolder />
            </div>
            <p className="text-slate-dark dark:text-slate-100 font-semibold text-lg">Nothing shared with you yet</p>
            <p className="text-slate-mid dark:text-slate-400 text-sm mt-1">When a teammate shares a folder with you, it will appear here.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
            {withMe.map((folder, i) => (
              <div
                key={folder.id}
                className={`flex items-center gap-4 px-5 py-4 group hover:bg-brand-bg/40 dark:hover:bg-slate-700/40 transition
                            ${i !== withMe.length - 1 ? 'border-b border-slate-light/60 dark:border-slate-700/60' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <IconFolder />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{folder.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      folder.permission === 'write'
                        ? 'bg-brand/10 dark:bg-brand/20 text-brand'
                        : 'bg-slate-light/60 dark:bg-slate-700 text-slate-mid dark:text-slate-300'
                    }`}>
                      {folder.permission}
                    </span>
                  </div>
                  <p className="text-xs text-slate-mid dark:text-slate-400 mt-0.5">
                    Shared by <span className="font-medium">{folder.shared_by_name || folder.shared_by_email}</span>
                    {' '}· {timeAgo(folder.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <a
                    href={`/files?folder=${folder.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-brand text-brand
                               hover:bg-brand hover:text-white transition font-medium"
                  >
                    Open →
                  </a>
                  <button
                    onClick={() => leaveFolder(folder.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-500
                               hover:bg-red-500 hover:text-white transition font-medium cursor-pointer"
                  >
                    Leave
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showCreate && (
        <CreateLinkModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { load(); showToast('Public link created!'); }}
        />
      )}

      {toast && <Toast message={toast} />}
    </DashboardLayout>
  );
}

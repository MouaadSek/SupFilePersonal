'use client';

import { useState, useEffect, useRef, useCallback, Suspense, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { getApiBase } from '@/lib/apiBase';
import {
  IconFolder, IconFile, IconImage, IconVideo, IconMusic,
  IconUpload, IconChevronRight, IconTrash, IconShare,
} from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  updated_at: string;
  item_count?: number;
}

interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  updated_at: string;
  folder_id: string | null;
}

interface Crumb { id: string | null; name: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const gb = bytes / 1_073_741_824;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1_048_576;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <IconImage />;
  if (mime.startsWith('video/')) return <IconVideo />;
  if (mime.startsWith('audio/')) return <IconMusic />;
  return <IconFile />;
}

function mimeColor(mime: string) {
  if (mime.startsWith('image/')) return { bg: '#edf3f9', color: '#2da2fd' };
  if (mime.startsWith('video/')) return { bg: '#e8f7ff', color: '#3cb5ff' };
  if (mime.startsWith('audio/')) return { bg: '#f3f4f6', color: '#858c92' };
  return { bg: '#f0f2f4', color: '#364751' };
}

function isPreviewable(mime: string) {
  return (
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime.startsWith('audio/') ||
    mime.startsWith('video/')
  );
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
                    shadow-lg overflow-hidden toast-in ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      <div className="flex items-center gap-2 px-5 py-3">
        {type === 'error' ? '✗' : '✓'} {message}
      </div>
      <div className="h-[3px] bg-black/10">
        <div className="h-full bg-white/50 toast-bar" />
      </div>
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ crumbs, onNavigate }: { crumbs: Crumb[]; onNavigate: (id: string | null) => void }) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-light"><IconChevronRight /></span>}
          <button
            onClick={() => onNavigate(c.id)}
            className={`hover:text-brand transition-colors ${
              i === crumbs.length - 1
                ? 'text-slate-dark dark:text-slate-100 font-semibold cursor-default pointer-events-none'
                : 'text-slate-mid cursor-pointer'
            }`}
          >
            {c.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

// ─── New folder modal ─────────────────────────────────────────────────────────

function NewFolderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.post('/folders', { name: name.trim() });
      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-slate-dark dark:text-slate-100 mb-4">New Folder</h3>
        <form onSubmit={submit} className="space-y-4">
          <input
            autoFocus
            type="text"
            className="input-field"
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark dark:hover:text-slate-100 transition">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || loading}
              className="px-4 py-2 text-sm bg-brand text-white rounded-xl hover:bg-brand-light transition disabled:opacity-50">
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Share link modal (create public link with password + expiry) ─────────────

function ShareLinkModal({
  target,
  onClose,
}: {
  target: { type: 'file' | 'folder'; id: string; name: string };
  onClose: () => void;
}) {
  const [expiry, setExpiry] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/shares', {
        [target.type === 'file' ? 'file_id' : 'folder_id']: target.id,
        expires_at: expiry || null,
        password: password || null,
      });
      setCreatedUrl(`${window.location.origin}/share/${res.data.token}`);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to create link.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-slate-dark dark:text-slate-100 text-lg mb-1">
          Share &ldquo;{target.name}&rdquo;
        </h3>
        <p className="text-sm text-slate-mid dark:text-slate-400 mb-5">Create a public link to share this {target.type}.</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {createdUrl ? (
          <div className="space-y-4">
            <div className="p-3 bg-brand-bg dark:bg-slate-700/50 rounded-xl">
              <p className="text-xs text-slate-mid dark:text-slate-400 mb-1">Public link created:</p>
              <p className="text-sm font-mono text-slate-dark dark:text-slate-100 break-all">{createdUrl}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copy}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  copied ? 'bg-green-500 text-white' : 'bg-brand text-white hover:bg-brand-light'
                }`}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 text-sm text-slate-mid dark:text-slate-400 border border-slate-light dark:border-slate-600 rounded-xl hover:border-slate-dark dark:hover:border-slate-400 transition">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
                Expires at <span className="text-slate-mid dark:text-slate-400 font-normal">(optional)</span>
              </label>
              <input type="datetime-local" className="input-field" value={expiry}
                onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
                Password <span className="text-slate-mid dark:text-slate-400 font-normal">(optional)</span>
              </label>
              <input type="password" className="input-field"
                placeholder="Leave empty for public access"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark dark:hover:text-slate-100 transition">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-xl
                           hover:bg-brand-light transition disabled:opacity-50">
                {loading ? 'Creating…' : 'Create link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Folder-share modal (share with another user by email) ────────────────────

function FolderShareModal({
  folder,
  onClose,
  onShared,
}: {
  folder: Folder;
  onClose: () => void;
  onShared: () => void;
}) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'write'>('read');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const lookupRes = await api.get(`/users/lookup?email=${encodeURIComponent(email.trim())}`);
      await api.post(`/folders/${folder.id}/members`, {
        user_id: lookupRes.data.id,
        permission,
      });
      onShared();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to share. Check the email address.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-slate-dark dark:text-slate-100 mb-1">Share with someone</h3>
        <p className="text-sm text-slate-mid dark:text-slate-400 mb-5">
          Give another user access to &ldquo;{folder.name}&rdquo;.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">User email</label>
            <input
              autoFocus
              type="email"
              className="input-field"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
                      : 'border-slate-light text-slate-mid hover:border-brand hover:text-brand'
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
            <button type="submit" disabled={!email.trim() || loading}
              className="px-4 py-2 text-sm bg-brand text-white rounded-xl
                         hover:bg-brand-light transition disabled:opacity-50">
              {loading ? 'Sharing…' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Text preview (reads content from a blob URL) ─────────────────────────────

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((t) => { setText(t); setFetching(false); })
      .catch(() => { setText('Failed to load content.'); setFetching(false); });
  }, [url]);

  if (fetching) {
    return <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />;
  }
  return (
    <pre className="text-sm text-slate-dark dark:text-slate-100 whitespace-pre-wrap font-mono leading-relaxed">
      {text}
    </pre>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({
  file,
  blobUrl,
  loading,
  onClose,
}: {
  file: FileItem;
  blobUrl: string | null;
  loading: boolean;
  onClose: () => void;
}) {
  const mime = file.mime_type;
  const downloadUrl = `${getApiBase()}/files/${file.id}/download?token=${getToken()}`;

  function renderBody() {
    if (loading) {
      return <div className="w-10 h-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />;
    }
    if (!blobUrl) {
      return (
        <div className="text-center space-y-3">
          <p className="text-slate-mid text-sm">Preview not available for this file type.</p>
          <a href={downloadUrl}
            className="inline-block px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-medium
                       hover:bg-brand-light transition">
            Download
          </a>
        </div>
      );
    }
    if (mime.startsWith('image/')) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={blobUrl} alt={file.name}
          className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-sm" />
      );
    }
    if (mime === 'application/pdf') {
      return (
        <iframe src={blobUrl} title={file.name}
          className="w-full h-[65vh] rounded-xl border border-slate-light" />
      );
    }
    if (mime.startsWith('text/') || mime === 'application/json') {
      return (
        <div className="w-full max-h-[65vh] overflow-auto bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-light dark:border-slate-600">
          <TextPreview url={blobUrl} />
        </div>
      );
    }
    if (mime.startsWith('audio/')) {
      return (
        <div className="w-full p-8 bg-slate-50 rounded-xl border border-slate-light
                        flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-light/60 flex items-center justify-center text-slate-mid">
            <IconMusic />
          </div>
          <audio src={blobUrl} controls className="w-full max-w-sm" />
        </div>
      );
    }
    if (mime.startsWith('video/')) {
      return (
        <video src={blobUrl} controls
          className="max-w-full max-h-[65vh] rounded-xl shadow-sm" />
      );
    }
    return (
      <div className="text-center space-y-3">
        <p className="text-slate-mid text-sm">No preview available for this file type.</p>
        <a href={downloadUrl}
          className="inline-block px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-medium
                     hover:bg-brand-light transition">
          Download
        </a>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-light/80 dark:border-slate-700">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="font-semibold text-slate-dark dark:text-slate-100 truncate">{file.name}</h3>
            <p className="text-xs text-slate-mid dark:text-slate-400 mt-0.5">
              {formatBytes(file.size)} &middot; {mime} &middot;{' '}
              {new Date(file.updated_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={downloadUrl}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-light text-slate-mid
                         hover:border-brand hover:text-brand transition">
              Download
            </a>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-mid dark:text-slate-400
                         hover:text-slate-dark dark:hover:text-slate-100 hover:bg-slate-light/60 dark:hover:bg-slate-700 transition text-xl leading-none">
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-0">
          {renderBody()}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function FilesPageInner() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [folderId, setFolderId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: 'My Files' }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);

  // upload
  const [uploadItems, setUploadItems] = useState<{ name: string; pct: number; done: boolean; failed?: boolean }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const uploading = uploadItems.some(i => !i.done);

  // drag & drop
  const [draggingFile, setDraggingFile] = useState<FileItem | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // preview
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // modals
  const [shareTarget, setShareTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [folderShareTarget, setFolderShareTarget] = useState<Folder | null>(null);

  // toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // desktop drag-to-upload overlay
  const [isDragOver, setIsDragOver] = useState(false);

  // three-dot action menu
  const [activeMenu, setActiveMenu] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);

  // inline rename
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // search — derived directly from URL so they're always in sync with searchParams
  const searchQuery  = searchParams.get('q')    ?? '';
  const searchType   = searchParams.get('type') ?? '';
  const searchDate   = searchParams.get('date') ?? '';
  const isSearchMode = !!(searchQuery || searchType || searchDate);
  const [searchFiles,   setSearchFiles]   = useState<FileItem[]>([]);
  const [searchFolders, setSearchFolders] = useState<Folder[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Close three-dot menu on outside click ────────────────────────────────

  useEffect(() => {
    if (!activeMenu) return;
    function close(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-menu]')) setActiveMenu(null);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [activeMenu]);

  // ── Block browser's default file-open on drag-drop anywhere on the page ──

  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', prevent);
    return () => {
      document.removeEventListener('dragover', prevent);
      document.removeEventListener('drop', prevent);
    };
  }, []);

  // ── Folder navigation from ?folder= URL param ────────────────────────────

  useEffect(() => {
    const folder = searchParams.get('folder');
    if (folder) {
      setCrumbs([{ id: null, name: 'My Files' }, { id: folder, name: '…' }]);
      setFolderId(folder);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search data loading ──────────────────────────────────────────────────
  // searchQuery / searchType / searchDate / isSearchMode are derived from
  // searchParams directly above, so they update synchronously with URL changes.

  useEffect(() => {
    if (!isSearchMode) {
      setSearchFiles([]);
      setSearchFolders([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);

    const p = new URLSearchParams();
    if (searchQuery) p.set('q', searchQuery);
    if (searchType)  p.set('type', searchType);
    if (searchDate) {
      const now = Date.now();
      const dateStr =
        searchDate === 'today' ? new Date().toISOString().split('T')[0]
        : searchDate === 'week'  ? new Date(now - 7  * 86400000).toISOString().split('T')[0]
        : searchDate === 'month' ? new Date(now - 30 * 86400000).toISOString().split('T')[0]
        : searchDate;
      p.set('date', dateStr);
    }

    api.get(`/search?${p.toString()}`)
      .then((res) => {
        if (!cancelled) {
          setSearchFiles(res.data.files ?? []);
          setSearchFolders(res.data.folders ?? []);
        }
      })
      .catch(() => { if (!cancelled) showToast('Search failed.', 'error'); })
      .finally(() => { if (!cancelled) setSearchLoading(false); });

    return () => { cancelled = true; };
  }, [isSearchMode, searchQuery, searchType, searchDate]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateSearchFilter(q: string, type: string, date: string) {
    const p = new URLSearchParams();
    if (q)    p.set('q',    q);
    if (type) p.set('type', type);
    if (date) p.set('date', date);
    router.replace(p.toString() ? `/files?${p.toString()}` : '/files', { scroll: false });
  }

  function clearSearch() {
    router.replace('/files', { scroll: false });
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  async function load(id: string | null) {
    setLoading(true);
    try {
      const url = id ? `/folders/${id}` : '/folders';
      const res = await api.get(url);
      setFolders(res.data.folders ?? []);
      setFiles(res.data.files ?? []);
      // Update placeholder crumb name when navigating from a shared-folder link
      if (id && res.data.folder?.name) {
        setCrumbs((c) =>
          c.map((crumb) =>
            crumb.id === id && crumb.name === '…'
              ? { ...crumb, name: res.data.folder.name }
              : crumb
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(folderId); }, [folderId]); // eslint-disable-line react-hooks/exhaustive-deps

  function openFolder(f: Folder) {
    setFolderId(f.id);
    setCrumbs((c) => [...c, { id: f.id, name: f.name }]);
  }

  function navigateCrumb(id: string | null) {
    const idx = crumbs.findIndex((c) => c.id === id);
    setCrumbs((c) => c.slice(0, idx + 1));
    setFolderId(id);
  }

  async function trashFile(id: string) {
    await api.delete(`/files/${id}`);
    load(folderId);
  }

  async function trashFolder(id: string) {
    await api.delete(`/folders/${id}`);
    load(folderId);
  }

  async function renameFile(id: string, newName: string) {
    if (!newName.trim()) { setRenameTarget(null); return; }
    try {
      await api.patch(`/files/${id}`, { name: newName.trim() });
      setFiles((prev) => prev.map((f) => f.id === id ? { ...f, name: newName.trim() } : f));
      showToast(`Renamed to "${newName.trim()}"`);
    } catch {
      showToast('Rename failed.', 'error');
    } finally {
      setRenameTarget(null);
    }
  }

  async function renameFolder(id: string, newName: string) {
    if (!newName.trim()) { setRenameTarget(null); return; }
    try {
      await api.patch(`/folders/${id}`, { name: newName.trim() });
      setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name: newName.trim() } : f));
      showToast(`Renamed to "${newName.trim()}"`);
    } catch {
      showToast('Rename failed.', 'error');
    } finally {
      setRenameTarget(null);
    }
  }

  function startRename(type: 'file' | 'folder', id: string, currentName: string) {
    setRenameTarget({ type, id });
    setRenameValue(currentName);
    setActiveMenu(null);
  }

  // ── Upload ───────────────────────────────────────────────────────────────

  const uploadSingleFile = useCallback((file: File, onProgress: (pct: number) => void): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const form = new FormData();
      form.append('file', file);
      if (folderId) form.append('folder_id', folderId);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };

      const cleanup = () => {
        xhrRef.current = null;
        if (fileInput.current) fileInput.current.value = '';
      };

      xhr.onload = () => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) {
          showToast(`"${file.name}" uploaded!`);
          resolve(true);
        } else {
          let msg = 'Upload failed. Please try again.';
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status === 413) {
              msg = 'Storage quota exceeded. Free up space or upgrade your plan.';
            } else if (data?.error?.includes('file size')) {
              msg = 'File too large. Maximum allowed size is 5 GB.';
            } else if (data?.error) {
              msg = data.error;
            }
          } catch { /* ignore parse error */ }
          setUploadError(msg);
          setFailedFile(file);
          resolve(false);
        }
      };

      xhr.onerror = () => {
        cleanup();
        setUploadError('Network error. Please try again.');
        setFailedFile(file);
        resolve(false);
      };

      xhr.onabort = () => {
        cleanup();
        resolve(false);
      };

      xhr.open('POST', `${getApiBase()}/files/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
      xhr.send(form);
    });
  }, [folderId]); // eslint-disable-line react-hooks/exhaustive-deps

  function cancelUpload() {
    xhrRef.current?.abort();
    setUploadError(null);
    setFailedFile(null);
  }

  async function retryUpload() {
    if (!failedFile) return;
    const file = failedFile;
    setFailedFile(null);
    setUploadError(null);
    setUploadItems([{ name: file.name, pct: 0, done: false }]);
    const ok = await uploadSingleFile(file, (pct) => {
      setUploadItems([{ name: file.name, pct, done: false }]);
    });
    setUploadItems([{ name: file.name, pct: ok ? 100 : 0, done: true, failed: !ok }]);
    setTimeout(() => setUploadItems([]), 2000);
    load(folderId);
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files ?? []);
    if (!fileList.length) return;
    setUploadError(null);
    setFailedFile(null);
    setUploadItems(fileList.map(f => ({ name: f.name, pct: 0, done: false })));
    for (let i = 0; i < fileList.length; i++) {
      const ok = await uploadSingleFile(fileList[i], (pct) => {
        setUploadItems(prev => prev.map((item, idx) => idx === i ? { ...item, pct } : item));
      });
      setUploadItems(prev => prev.map((item, idx) =>
        idx === i ? { ...item, pct: ok ? 100 : item.pct, done: true, failed: !ok } : item
      ));
      if (!ok) break;
    }
    load(folderId);
    setTimeout(() => setUploadItems([]), 2000);
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, file: FileItem) {
    setDraggingFile(file);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDraggingFile(null);
    setDragOverFolderId(null);
  }

  function handleFolderDragOver(e: React.DragEvent, folder: Folder) {
    if (!draggingFile) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folder.id);
  }

  function handleFolderDragLeave(e: React.DragEvent) {
    // Only clear if leaving the folder card entirely (not entering a child element)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverFolderId(null);
    }
  }

  async function handleFolderDrop(e: React.DragEvent, folder: Folder) {
    e.preventDefault();
    setDragOverFolderId(null);
    if (!draggingFile) return;
    if (draggingFile.folder_id === folder.id) return;
    const moved = draggingFile;
    setDraggingFile(null);
    try {
      await api.patch(`/files/${moved.id}`, { folder_id: folder.id });
      load(folderId);
      showToast(`Moved "${moved.name}" to "${folder.name}"`);
    } catch {
      showToast('Failed to move file.', 'error');
    }
  }

  // ── Page-level drag & drop for desktop-file upload ───────────────────────

  function handlePageDragOver(e: React.DragEvent) {
    if (draggingFile) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setIsDragOver(true);
  }

  function handlePageDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handlePageDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (draggingFile) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length) return;
    setUploadError(null);
    setFailedFile(null);
    setUploadItems(dropped.map(f => ({ name: f.name, pct: 0, done: false })));
    for (let i = 0; i < dropped.length; i++) {
      const ok = await uploadSingleFile(dropped[i], (pct) => {
        setUploadItems(prev => prev.map((item, idx) => idx === i ? { ...item, pct } : item));
      });
      setUploadItems(prev => prev.map((item, idx) =>
        idx === i ? { ...item, pct: ok ? 100 : item.pct, done: true, failed: !ok } : item
      ));
      if (!ok) break;
    }
    load(folderId);
    setTimeout(() => setUploadItems([]), 2000);
  }

  // ── Preview ──────────────────────────────────────────────────────────────

  async function openPreview(file: FileItem) {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewBlobUrl(null);

    if (!isPreviewable(file.mime_type)) {
      setPreviewLoading(false);
      return;
    }

    try {
      const token = getToken();
      const previewUrl = token
        ? `${getApiBase()}/files/${file.id}/preview?access_token=${encodeURIComponent(token)}`
        : `${getApiBase()}/files/${file.id}/preview`;
      const res = await fetch(previewUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load preview');
      const blob = await res.blob();
      setPreviewBlobUrl(URL.createObjectURL(blob));
    } catch {
      setPreviewBlobUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewFile(null);
    setPreviewBlobUrl(null);
  }

  // ── Download ZIP ─────────────────────────────────────────────────────────

  async function downloadZip(folder: Folder) {
    try {
      const res = await fetch(`${getApiBase()}/folders/${folder.id}/zip`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('ZIP failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folder.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to download ZIP.', 'error');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">My Files</h1>
          <div className="mt-1.5">
            <Breadcrumb crumbs={crumbs} onNavigate={navigateCrumb} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-light dark:border-slate-600 bg-white dark:bg-slate-800
                       text-sm font-medium text-slate-dark dark:text-slate-100 hover:border-brand hover:text-brand transition"
          >
            <IconFolder /> New Folder
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white
                            text-sm font-medium cursor-pointer hover:bg-brand-light transition">
            <IconUpload />
            {uploading
              ? `${uploadItems.filter(i => i.done).length}/${uploadItems.length}`
              : 'Upload'}
            <input ref={fileInput} type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* Upload progress — per-file rows */}
      {uploadItems.length > 0 && (
        <div className="mb-4 bg-white dark:bg-slate-800 border border-slate-light dark:border-slate-700
                        rounded-2xl p-4 space-y-3">
          {uploadItems.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-dark dark:text-slate-100 font-medium truncate max-w-xs">{item.name}</span>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {item.done ? (
                    item.failed
                      ? <span className="text-red-500">Failed</span>
                      : <span className="text-green-500">Done</span>
                  ) : (
                    <>
                      <span className="font-medium text-brand">{item.pct}%</span>
                      {!uploadItems.slice(0, i).some(x => !x.done) && (
                        <button onClick={cancelUpload}
                          className="px-2 py-0.5 rounded-md border border-red-300 text-red-500 hover:bg-red-50 transition text-xs">
                          Cancel
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-slate-light/60 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-150 ${
                  item.failed ? 'bg-red-400' : item.done ? 'bg-green-500' : 'bg-brand'
                }`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm
                        flex items-center justify-between">
          <span>{uploadError}</span>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {failedFile && (
              <button
                onClick={retryUpload}
                className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition"
              >
                Retry
              </button>
            )}
            <button onClick={() => { setUploadError(null); setFailedFile(null); }}
              className="text-red-400 hover:text-red-600 transition">✕</button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {isSearchMode ? (
        <div>
          {/* Search header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-dark dark:text-slate-100">
                Search results{searchQuery ? ` for "${searchQuery}"` : ''}
              </h2>
              <p className="text-sm text-slate-mid dark:text-slate-400 mt-0.5">
                {searchFolders.length + searchFiles.length} result{searchFolders.length + searchFiles.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={clearSearch}
              className="flex items-center gap-1.5 text-sm text-slate-mid dark:text-slate-400
                         hover:text-slate-dark dark:hover:text-slate-100 transition cursor-pointer"
            >
              <span className="text-base leading-none">✕</span> Clear search
            </button>
          </div>

          {/* Type + date filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            {([
              { label: 'All',       value: '' },
              { label: 'Images',    value: 'image' },
              { label: 'Videos',    value: 'video' },
              { label: 'Audio',     value: 'audio' },
              { label: 'Documents', value: 'application/pdf,text' },
            ] as const).map(({ label, value }) => (
              <button
                key={label}
                onClick={() => updateSearchFilter(searchQuery, value, searchDate)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  searchType === value
                    ? 'bg-brand text-white border-brand'
                    : 'border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400 hover:border-brand hover:text-brand'
                }`}
              >
                {label}
              </button>
            ))}

            <div className="flex items-center gap-2 flex-wrap">
              {([
                { label: 'Any time',   value: '' },
                { label: 'Today',      value: 'today' },
                { label: 'This week',  value: 'week' },
                { label: 'This month', value: 'month' },
              ] as const).map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => updateSearchFilter(searchQuery, searchType, value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    searchDate === value
                      ? 'bg-brand text-white border-brand'
                      : 'border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400 hover:border-brand hover:text-brand'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {searchLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : searchFolders.length === 0 && searchFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-slate-dark dark:text-slate-100 font-semibold text-lg">No results found</p>
              <p className="text-slate-mid dark:text-slate-400 text-sm mt-1">Try different keywords or filters.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {searchFolders.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-slate-mid dark:text-slate-500 uppercase tracking-wider mb-3">
                    Folders ({searchFolders.length})
                  </h2>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
                    {searchFolders.map((f, i) => (
                      <div
                        key={f.id}
                        onClick={() => { clearSearch(); openFolder(f); }}
                        className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3.5 hover:bg-brand-bg/50 dark:hover:bg-slate-700/50
                                    transition cursor-pointer group
                                    ${i !== searchFolders.length - 1 ? 'border-b border-slate-light/60 dark:border-slate-700/60' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                          <IconFolder />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{f.name}</p>
                          <p className="text-xs text-slate-mid dark:text-slate-400">{timeAgo(f.updated_at)}</p>
                        </div>
                        <span className="text-slate-mid dark:text-slate-500 opacity-0 group-hover:opacity-100 transition">
                          <IconChevronRight />
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {searchFiles.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-slate-mid dark:text-slate-500 uppercase tracking-wider mb-3">
                    Files ({searchFiles.length})
                  </h2>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
                    {searchFiles.map((f, i) => {
                      const { bg, color } = mimeColor(f.mime_type);
                      return (
                        <div
                          key={f.id}
                          className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3.5 hover:bg-brand-bg/50 dark:hover:bg-slate-700/50 transition group
                                      ${i !== searchFiles.length - 1 ? 'border-b border-slate-light/60 dark:border-slate-700/60' : ''}`}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                            style={{ background: bg, color }}>
                            {f.mime_type.startsWith('image/') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`${getApiBase()}/files/${f.id}/preview?access_token=${encodeURIComponent(getToken())}`}
                                alt={f.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement | null)?.style.removeProperty('display'); }}
                              />
                            ) : null}
                            <span style={f.mime_type.startsWith('image/') ? { display: 'none' } : {}}>
                              <FileIcon mime={f.mime_type} />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{f.name}</p>
                            <p className="text-xs text-slate-mid dark:text-slate-400">{formatBytes(f.size)} · {timeAgo(f.updated_at)}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                            <button onClick={() => openPreview(f)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400 hover:border-brand hover:text-brand transition">
                              Preview
                            </button>
                            <button onClick={() => setShareTarget({ type: 'file', id: f.id, name: f.name })}
                              className="text-xs px-3 py-1.5 rounded-lg border border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400 hover:border-brand hover:text-brand transition">
                              Share
                            </button>
                            <a href={`${getApiBase()}/files/${f.id}/download?token=${getToken()}`}
                              className="text-xs px-3 py-1.5 rounded-lg border border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400 hover:border-brand hover:text-brand transition">
                              Download
                            </a>
                            <button onClick={() => trashFile(f.id)}
                              className="text-slate-mid hover:text-red-500 transition p-1 cursor-pointer">
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className="relative"
          onDragOver={handlePageDragOver}
          onDragLeave={handlePageDragLeave}
          onDrop={handlePageDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center
                            rounded-2xl border-2 border-dashed border-brand bg-brand/5 min-h-48
                            pointer-events-none">
              <p className="text-xl font-bold text-brand">Drop files to upload</p>
              <p className="text-sm text-slate-mid mt-1">Release to upload to the current folder</p>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width={96} height={96} viewBox="0 0 96 96" fill="none" className="mb-5 opacity-80">
                <rect x="8" y="28" width="80" height="56" rx="8" fill="#edf3f9" stroke="#2da2fd" strokeWidth="2"/>
                <path d="M8 44h80" stroke="#2da2fd" strokeWidth="1.5" strokeDasharray="4 3"/>
                <rect x="8" y="20" width="36" height="12" rx="4" fill="#d1e8fd" stroke="#2da2fd" strokeWidth="2"/>
                <circle cx="68" cy="56" r="14" fill="#2da2fd" fillOpacity="0.12" stroke="#2da2fd" strokeWidth="1.5"/>
                <path d="M68 50v12M62 56l6-6 6 6" stroke="#2da2fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-slate-dark dark:text-slate-100 font-semibold text-lg">This folder is empty</p>
              <p className="text-slate-mid dark:text-slate-400 text-sm mt-1 mb-6">
                Upload a file or create a new folder to get started.
              </p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl
                                  text-sm font-medium cursor-pointer hover:bg-brand-light transition">
                  <IconUpload /> Upload a file
                  <input type="file" multiple className="hidden" onChange={handleUpload} />
                </label>
                <button onClick={() => setShowNewFolder(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-light dark:border-slate-600
                             text-sm font-medium text-slate-dark dark:text-slate-100 hover:border-brand hover:text-brand transition">
                  <IconFolder /> New Folder
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Folders */}
              {folders.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-slate-mid uppercase tracking-wider mb-3">
                    Folders ({folders.length})
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {folders.map((f) => {
                      const isOver = dragOverFolderId === f.id;
                      return (
                        <div
                          key={f.id}
                          onDoubleClick={() => openFolder(f)}
                          onDragOver={(e) => handleFolderDragOver(e, f)}
                          onDragLeave={(e) => handleFolderDragLeave(e)}
                          onDrop={(e) => handleFolderDrop(e, f)}
                          className={`group relative bg-white dark:bg-slate-800 border rounded-2xl p-4 flex flex-col
                                     items-center gap-2 cursor-pointer select-none transition-all
                                     ${isOver
                                       ? 'border-brand bg-brand/5 shadow-md scale-[1.02]'
                                       : 'border-slate-light dark:border-slate-700 hover:border-brand hover:shadow-md hover:scale-[1.01]'
                                     }`}
                        >
                          {isOver && (
                            <div className="absolute inset-0 rounded-2xl border-2 border-brand border-dashed pointer-events-none" />
                          )}

                          <div className="w-10 h-10 flex items-center justify-center">
                            <svg width={40} height={40} viewBox="0 0 24 24"
                              fill={isOver ? '#dbeafe' : '#edf3f9'}
                              stroke="#2da2fd" strokeWidth={1.5}
                              strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                          </div>

                          {renameTarget?.type === 'folder' && renameTarget?.id === f.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') renameFolder(f.id, renameValue);
                                if (e.key === 'Escape') setRenameTarget(null);
                              }}
                              onBlur={() => setRenameTarget(null)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium text-center w-full rounded px-1 py-0.5 bg-brand-bg dark:bg-slate-700 border border-brand focus:outline-none"
                            />
                          ) : (
                            <>
                              <p className="text-xs font-medium text-slate-dark dark:text-slate-100 text-center truncate w-full">
                                {f.name}
                              </p>
                              <p className="text-[10px] text-slate-mid dark:text-slate-400 text-center">
                                {(f.item_count ?? 0) === 1 ? '1 item' : `${f.item_count ?? 0} items`}
                              </p>
                            </>
                          )}

                          <div className="absolute top-2 right-2 flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadZip(f); }}
                              title="Download as ZIP"
                              className="text-slate-mid hover:text-brand transition p-1 rounded cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth={2}
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShareTarget({ type: 'folder', id: f.id, name: f.name }); }}
                              title="Create share link"
                              className="text-slate-mid hover:text-brand transition p-1 rounded cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <IconShare />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setFolderShareTarget(f); }}
                              title="Share with a teammate"
                              className="text-slate-mid hover:text-brand transition p-1 rounded cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth={2}
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); trashFolder(f.id); }}
                              title="Move to trash"
                              className="text-slate-mid hover:text-red-500 transition p-1 rounded cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth={2}>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" /><path d="M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>

                            {/* Three-dot menu — always visible for touch */}
                            <div className="relative" data-menu>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu?.id === f.id && activeMenu.type === 'folder' ? null : { type: 'folder', id: f.id }); }}
                                className="p-1 rounded text-slate-mid hover:text-brand hover:bg-slate-light/40 dark:hover:bg-slate-700 transition cursor-pointer"
                                title="More actions"
                              >
                                <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                                </svg>
                              </button>
                              {activeMenu?.type === 'folder' && activeMenu?.id === f.id && (
                                <div data-menu className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-light dark:border-slate-700 min-w-36 py-1.5">
                                  {[
                                    { label: 'Download ZIP', action: () => { downloadZip(f); setActiveMenu(null); } },
                                    { label: 'Share link',   action: () => { setShareTarget({ type: 'folder', id: f.id, name: f.name }); setActiveMenu(null); } },
                                    { label: 'Share with…', action: () => { setFolderShareTarget(f); setActiveMenu(null); } },
                                    { label: 'Rename',       action: () => startRename('folder', f.id, f.name) },
                                  ].map(({ label, action }) => (
                                    <button key={label} onClick={(e) => { e.stopPropagation(); action(); }}
                                      className="flex w-full items-center px-3 py-2 text-sm text-slate-dark dark:text-slate-100 hover:bg-brand-bg dark:hover:bg-slate-700 transition text-left cursor-pointer">
                                      {label}
                                    </button>
                                  ))}
                                  <button onClick={(e) => { e.stopPropagation(); trashFolder(f.id); setActiveMenu(null); }}
                                    className="flex w-full items-center px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left cursor-pointer">
                                    Move to trash
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Files */}
              {files.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-slate-mid uppercase tracking-wider mb-3">
                    Files ({files.length})
                  </h2>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700">
                    {files.map((f, i) => {
                      const { bg, color } = mimeColor(f.mime_type);
                      const isDragging = draggingFile?.id === f.id;
                      return (
                        <div
                          key={f.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, f)}
                          onDragEnd={handleDragEnd}
                          className={`relative flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3.5 hover:bg-brand-bg/50 dark:hover:bg-slate-700/50 transition group
                                      cursor-grab active:cursor-grabbing overflow-hidden
                                      ${i === 0 ? 'rounded-t-2xl' : ''}
                                      ${i === files.length - 1 ? 'rounded-b-2xl' : 'border-b border-slate-light/60 dark:border-slate-700/60'}
                                      ${isDragging ? 'opacity-40 bg-brand-bg/30 dark:bg-slate-700/30' : ''}`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: color }} />
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                            style={{ background: bg, color }}>
                            {f.mime_type.startsWith('image/') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`${getApiBase()}/files/${f.id}/preview?access_token=${encodeURIComponent(getToken())}`}
                                alt={f.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement | null)?.style.removeProperty('display'); }}
                              />
                            ) : null}
                            <span style={f.mime_type.startsWith('image/') ? { display: 'none' } : {}}>
                              <FileIcon mime={f.mime_type} />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {renameTarget?.type === 'file' && renameTarget?.id === f.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') renameFile(f.id, renameValue);
                                  if (e.key === 'Escape') setRenameTarget(null);
                                }}
                                onBlur={() => setRenameTarget(null)}
                                className="text-sm font-medium w-full rounded px-1 py-0.5 bg-brand-bg dark:bg-slate-700 border border-brand focus:outline-none text-slate-dark dark:text-slate-100"
                              />
                            ) : (
                              <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{f.name}</p>
                            )}
                            <p className="text-xs text-slate-mid dark:text-slate-400">{formatBytes(f.size)} · {timeAgo(f.updated_at)}</p>
                          </div>
                          <div className="relative shrink-0" data-menu>
                            <button
                              onClick={() => setActiveMenu(activeMenu?.id === f.id && activeMenu.type === 'file' ? null : { type: 'file', id: f.id })}
                              className="p-1.5 rounded-lg text-slate-mid hover:text-slate-dark dark:hover:text-slate-100 hover:bg-slate-light/40 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="More actions"
                            >
                              <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                              </svg>
                            </button>
                            {activeMenu?.type === 'file' && activeMenu?.id === f.id && (
                              <div data-menu className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-light dark:border-slate-700 min-w-36 py-1.5">
                                <button onClick={() => { openPreview(f); setActiveMenu(null); }}
                                  className="flex w-full items-center px-3 py-2 text-sm text-slate-dark dark:text-slate-100 hover:bg-brand-bg dark:hover:bg-slate-700 transition text-left cursor-pointer">
                                  Preview
                                </button>
                                <button onClick={() => { setShareTarget({ type: 'file', id: f.id, name: f.name }); setActiveMenu(null); }}
                                  className="flex w-full items-center px-3 py-2 text-sm text-slate-dark dark:text-slate-100 hover:bg-brand-bg dark:hover:bg-slate-700 transition text-left cursor-pointer">
                                  Share
                                </button>
                                <a href={`${getApiBase()}/files/${f.id}/download?token=${getToken()}`}
                                  onClick={() => setActiveMenu(null)}
                                  className="flex w-full items-center px-3 py-2 text-sm text-slate-dark dark:text-slate-100 hover:bg-brand-bg dark:hover:bg-slate-700 transition text-left cursor-pointer">
                                  Download
                                </a>
                                <button onClick={() => startRename('file', f.id, f.name)}
                                  className="flex w-full items-center px-3 py-2 text-sm text-slate-dark dark:text-slate-100 hover:bg-brand-bg dark:hover:bg-slate-700 transition text-left cursor-pointer">
                                  Rename
                                </button>
                                <button onClick={() => { trashFile(f.id); setActiveMenu(null); }}
                                  className="flex w-full items-center px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left cursor-pointer">
                                  Move to trash
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {draggingFile && (
                    <p className="text-xs text-slate-mid text-center mt-3">
                      Drag onto a folder to move &ldquo;{draggingFile.name}&rdquo;
                    </p>
                  )}
                </section>
              )}
            </div>
          )}

          {/* Persistent drop zone hint — only when not dragging and folder has content */}
          {!isDragOver && !uploading && (folders.length > 0 || files.length > 0) && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-light dark:border-slate-700
                            flex items-center justify-center gap-2 py-4 text-slate-mid dark:text-slate-500 text-sm">
              <IconUpload />
              Drop files here or use the Upload button
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showNewFolder && (
        <NewFolderModal
          onClose={() => setShowNewFolder(false)}
          onCreated={() => load(folderId)}
        />
      )}

      {shareTarget && (
        <ShareLinkModal
          target={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {folderShareTarget && (
        <FolderShareModal
          folder={folderShareTarget}
          onClose={() => setFolderShareTarget(null)}
          onShared={() => showToast('Folder shared successfully!')}
        />
      )}

      {previewFile && (
        <PreviewModal
          file={previewFile}
          blobUrl={previewBlobUrl}
          loading={previewLoading}
          onClose={closePreview}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </DashboardLayout>
  );
}

export default function FilesPage() {
  return (
    <Suspense>
      <FilesPageInner />
    </Suspense>
  );
}

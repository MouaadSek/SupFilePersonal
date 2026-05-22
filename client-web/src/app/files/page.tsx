'use client';

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import {
  IconFolder, IconFile, IconImage, IconVideo, IconMusic,
  IconUpload, IconChevronRight, IconTrash, IconShare,
} from '@/components/icons';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  updated_at: string;
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
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-white text-sm
                    font-medium shadow-lg flex items-center gap-2 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {type === 'error' ? '✗' : '✓'} {message}
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
                ? 'text-slate-dark font-semibold cursor-default pointer-events-none'
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
              className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark transition">
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
            <div className="p-3 bg-brand-bg rounded-xl">
              <p className="text-xs text-slate-mid mb-1">Public link created:</p>
              <p className="text-sm font-mono text-slate-dark break-all">{createdUrl}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copy}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  copied ? 'bg-green-500 text-white' : 'bg-brand text-white hover:bg-brand-light'
                }`}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 text-sm text-slate-mid border border-slate-light rounded-xl hover:border-slate-dark transition">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">
                Expires at <span className="text-slate-mid font-normal">(optional)</span>
              </label>
              <input type="datetime-local" className="input-field" value={expiry}
                onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">
                Password <span className="text-slate-mid font-normal">(optional)</span>
              </label>
              <input type="password" className="input-field"
                placeholder="Leave empty for public access"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark transition">
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
            <label className="block text-sm font-medium text-slate-dark mb-1.5">User email</label>
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
            <label className="block text-sm font-medium text-slate-dark mb-1.5">Permission</label>
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
              className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark transition">
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
    <pre className="text-sm text-slate-dark whitespace-pre-wrap font-mono leading-relaxed">
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
  const downloadUrl = `${API_BASE}/files/${file.id}/download?token=${getToken()}`;

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
        <div className="w-full max-h-[65vh] overflow-auto bg-slate-50 rounded-xl p-4 border border-slate-light">
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
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-mid
                         hover:text-slate-dark hover:bg-slate-light/60 transition text-xl leading-none">
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

export default function FilesPage() {
  const { user, loading: authLoading, logout } = useAuth();

  const [folderId, setFolderId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: 'My Files' }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);

  // upload
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

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
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

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

  // ── URL param — navigate to a shared folder ──────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const folder = params.get('folder');
    if (folder) {
      setCrumbs([{ id: null, name: 'My Files' }, { id: folder, name: '…' }]);
      setFolderId(folder);
    }
  }, []);

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

  // ── Upload ───────────────────────────────────────────────────────────────

  const uploadSingleFile = useCallback((file: File): Promise<boolean> => {
    setUploading(true);
    setUploadPct(0);
    setUploadError(null);
    setFailedFile(null);
    setCurrentFileName(file.name);

    return new Promise<boolean>((resolve) => {
      const form = new FormData();
      form.append('file', file);
      if (folderId) form.append('folder_id', folderId);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100));
      };

      const cleanup = () => {
        setUploading(false);
        setUploadPct(0);
        setCurrentFileName(null);
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

      xhr.open('POST', `${API_BASE}/files/upload`);
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
    await uploadSingleFile(file);
    load(folderId);
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadSingleFile(file);
    load(folderId);
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
    for (const file of dropped) {
      await uploadSingleFile(file);
    }
    load(folderId);
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
      const res = await fetch(`${API_BASE}/files/${file.id}/preview`, {
        headers: { Authorization: `Bearer ${getToken()}` },
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
      const res = await fetch(`${API_BASE}/folders/${folder.id}/zip`, {
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-light bg-white
                       text-sm font-medium text-slate-dark hover:border-brand hover:text-brand transition"
          >
            <IconFolder /> New Folder
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white
                            text-sm font-medium cursor-pointer hover:bg-brand-light transition">
            <IconUpload />
            {uploading ? `${uploadPct}%` : 'Upload'}
            <input ref={fileInput} type="file" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-mid mb-1.5">
            <span>Uploading{currentFileName ? ` "${currentFileName}"` : ''}…</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-brand">{uploadPct}%</span>
              <button
                onClick={cancelUpload}
                className="px-2 py-0.5 rounded-md border border-red-300 text-red-500
                           hover:bg-red-50 transition text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="h-2 bg-slate-light/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-150"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
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
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-bg flex items-center justify-center mb-4 text-brand">
            <IconFolder />
          </div>
          <p className="text-slate-dark font-semibold text-lg">This folder is empty</p>
          <p className="text-slate-mid text-sm mt-1 mb-6">
            Upload a file or create a new folder to get started.
          </p>
          <label className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl
                            text-sm font-medium cursor-pointer hover:bg-brand-light transition">
            <IconUpload /> Upload a file
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
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
                                   : 'border-slate-light dark:border-slate-700 hover:border-brand hover:shadow-sm'
                                 }`}
                    >
                      {/* Dashed drop-target ring */}
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

                      <p className="text-xs font-medium text-slate-dark dark:text-slate-100 text-center truncate w-full">
                        {f.name}
                      </p>

                      {/* Folder action buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-0.5
                                      opacity-0 group-hover:opacity-100 transition">
                        {/* Download ZIP */}
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadZip(f); }}
                          title="Download as ZIP"
                          className="text-slate-mid hover:text-brand transition p-1 rounded"
                        >
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth={2}
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                        {/* Create public link */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareTarget({ type: 'folder', id: f.id, name: f.name });
                          }}
                          title="Create share link"
                          className="text-slate-mid hover:text-brand transition p-1 rounded"
                        >
                          <IconShare />
                        </button>
                        {/* Share with user */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setFolderShareTarget(f); }}
                          title="Share with a teammate"
                          className="text-slate-mid hover:text-brand transition p-1 rounded"
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
                        {/* Delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); trashFolder(f.id); }}
                          title="Move to trash"
                          className="text-slate-mid hover:text-red-500 transition p-1 rounded"
                        >
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
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
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
                {files.map((f, i) => {
                  const { bg, color } = mimeColor(f.mime_type);
                  const isDragging = draggingFile?.id === f.id;
                  return (
                    <div
                      key={f.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, f)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-4 px-5 py-3.5 hover:bg-brand-bg/50 dark:hover:bg-slate-700/50 transition group
                                  cursor-grab active:cursor-grabbing
                                  ${i !== files.length - 1 ? 'border-b border-slate-light/60 dark:border-slate-700/60' : ''}
                                  ${isDragging ? 'opacity-40 bg-brand-bg/30 dark:bg-slate-700/30' : ''}`}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: bg, color }}>
                        <FileIcon mime={f.mime_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{f.name}</p>
                        <p className="text-xs text-slate-mid dark:text-slate-400">{formatBytes(f.size)} · {timeAgo(f.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={() => openPreview(f)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-light text-slate-mid
                                     hover:border-brand hover:text-brand transition"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => setShareTarget({ type: 'file', id: f.id, name: f.name })}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-light text-slate-mid
                                     hover:border-brand hover:text-brand transition"
                        >
                          Share
                        </button>
                        <a
                          href={`${API_BASE}/files/${f.id}/download?token=${getToken()}`}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-light text-slate-mid
                                     hover:border-brand hover:text-brand transition"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => trashFile(f.id)}
                          className="text-slate-mid hover:text-red-500 transition p-1"
                          aria-label="Move to trash"
                        >
                          <IconTrash />
                        </button>
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

      </div>

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

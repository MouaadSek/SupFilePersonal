'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import {
  IconFolder, IconFile, IconImage, IconVideo, IconMusic,
  IconUpload, IconChevronRight, IconTrash,
} from '@/components/icons';

// ─── types ───────────────────────────────────────────────────────────────────

interface Folder { id: string; name: string; parent_id: string | null; updated_at: string; }
interface FileItem { id: string; name: string; mime_type: string; size: number; updated_at: string; }

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  if (m < 1)  return 'just now';
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

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 ${className}`} />;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

interface Crumb { id: string | null; name: string; }

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

// ─── New-folder modal ─────────────────────────────────────────────────────────

function NewFolderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]     = useState('');
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
      <div className="bg-white rounded-2xl border border-slate-light p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-slate-dark mb-4">New Folder</h3>
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const { user, loading: authLoading, logout } = useAuth();

  const [folderId, setFolderId] = useState<string | null>(null);
  const [crumbs,   setCrumbs]   = useState<Crumb[]>([{ id: null, name: 'My Files' }]);
  const [folders,  setFolders]  = useState<Folder[]>([]);
  const [files,    setFiles]    = useState<FileItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load(id: string | null) {
    setLoading(true);
    try {
      const url = id ? `/folders/${id}` : '/folders';
      const res = await api.get(url);
      setFolders(res.data.folders ?? []);
      setFiles(res.data.files ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(folderId); }, [folderId]);

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

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadPct(0);

    const form = new FormData();
    form.append('file', file);
    if (folderId) form.append('folder_id', folderId);

    try {
      await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadPct(Math.round((e.loaded / e.total) * 100));
        },
      });
      load(folderId);
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-dark">My Files</h1>
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

      {/* Upload progress bar */}
      {uploading && (
        <div className="mb-4 h-1.5 bg-slate-light rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-200"
            style={{ width: `${uploadPct}%` }}
          />
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-bg flex items-center justify-center mb-4 text-brand">
            <IconFolder />
          </div>
          <p className="text-slate-dark font-semibold text-lg">This folder is empty</p>
          <p className="text-slate-mid text-sm mt-1 mb-6">Upload a file or create a new folder to get started.</p>
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
                {folders.map((f) => (
                  <div
                    key={f.id}
                    onDoubleClick={() => openFolder(f)}
                    className="group relative bg-white border border-slate-light rounded-2xl p-4
                               flex flex-col items-center gap-2 cursor-pointer
                               hover:border-brand hover:shadow-sm transition select-none"
                  >
                    <div className="text-brand w-10 h-10 flex items-center justify-center">
                      <svg width={40} height={40} viewBox="0 0 24 24" fill="#edf3f9" stroke="#2da2fd" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-slate-dark text-center truncate w-full">{f.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); trashFolder(f.id); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-mid
                                 hover:text-red-500 transition p-1"
                      aria-label="Delete folder"
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Files */}
          {files.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-mid uppercase tracking-wider mb-3">
                Files ({files.length})
              </h2>
              <div className="bg-white rounded-2xl border border-slate-light overflow-hidden">
                {files.map((f, i) => {
                  const { bg, color } = mimeColor(f.mime_type);
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center gap-4 px-5 py-3.5 hover:bg-brand-bg/50 transition group
                                  ${i !== files.length - 1 ? 'border-b border-slate-light/60' : ''}`}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                           style={{ background: bg, color }}>
                        <FileIcon mime={f.mime_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-dark truncate">{f.name}</p>
                        <p className="text-xs text-slate-mid">{formatBytes(f.size)} · {timeAgo(f.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/files/${f.id}/download`}
                          target="_blank"
                          rel="noreferrer"
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
            </section>
          )}
        </div>
      )}

      {showNewFolder && (
        <NewFolderModal
          onClose={() => setShowNewFolder(false)}
          onCreated={() => load(folderId)}
        />
      )}
    </DashboardLayout>
  );
}

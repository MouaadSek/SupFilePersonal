'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { IconFile, IconImage, IconVideo, IconMusic, IconTrash } from '@/components/icons';

interface FileItem { id: string; name: string; mime_type: string; size: number; updated_at: string; }

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const mb = bytes / 1_048_576;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
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

// Confirmation dialog
function ConfirmDialog({
  message, onConfirm, onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-light p-6 w-full max-w-sm shadow-xl">
        <p className="text-slate-dark font-medium mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark transition">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition">
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrashPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [files,   setFiles]   = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<string | null>(null); // file id to permanently delete

  async function load() {
    setLoading(true);
    try {
      // Query trashed files via search — the server filters trashed=true
      const res = await api.get('/search?trashed=true');
      setFiles(res.data);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function restore(id: string) {
    await api.post(`/files/${id}/restore`);
    load();
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-dark">Trash</h1>
          <p className="text-sm text-slate-mid mt-1">Files here can be restored or permanently deleted.</p>
        </div>
        {files.length > 0 && (
          <span className="text-xs text-slate-mid bg-white border border-slate-light rounded-full px-3 py-1">
            {files.length} item{files.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-bg flex items-center justify-center mb-4 text-slate-mid">
            <IconTrash />
          </div>
          <p className="text-slate-dark font-semibold text-lg">Trash is empty</p>
          <p className="text-slate-mid text-sm mt-1">Deleted files will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-light overflow-hidden">
          {files.map((f, i) => {
            const { bg, color } = mimeColor(f.mime_type);
            return (
              <div
                key={f.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-red-50/40 transition group
                            ${i !== files.length - 1 ? 'border-b border-slate-light/60' : ''}`}
              >
                {/* icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 opacity-60"
                     style={{ background: bg, color }}>
                  <FileIcon mime={f.mime_type} />
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-dark truncate line-through opacity-60">{f.name}</p>
                  <p className="text-xs text-slate-mid">{formatBytes(f.size)} · deleted {timeAgo(f.updated_at)}</p>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button
                    onClick={() => restore(f.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-brand text-brand
                               hover:bg-brand hover:text-white transition font-medium"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirm(f.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500
                               hover:bg-red-500 hover:text-white transition font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          message="Permanently delete this file? This cannot be undone."
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            // permanent delete not yet in API — just a placeholder; use trash for now
            setConfirm(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}

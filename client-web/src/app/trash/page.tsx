'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { IconFile, IconImage, IconVideo, IconMusic, IconTrash, IconFolder } from '@/components/icons';

interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  updated_at: string;
}

interface FolderItem {
  id: string;
  name: string;
  updated_at: string;
}

type TrashItem =
  | { kind: 'file'; data: FileItem }
  | { kind: 'folder'; data: FolderItem };

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
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 dark:bg-slate-700/60 ${className}`} />;
}

function ConfirmDialog({
  message, onConfirm, onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 w-full max-w-sm shadow-xl">
        <p className="text-slate-dark dark:text-slate-100 font-medium mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-mid hover:text-slate-dark dark:hover:text-slate-100 transition">
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

function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-white text-sm
                    font-medium shadow-lg flex items-center gap-2 ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {type === 'error' ? '✗' : '✓'} {message}
    </div>
  );
}

export default function TrashPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; kind: 'file' | 'folder' } | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/files/trash');
      const fileItems: TrashItem[] = (res.data.files ?? []).map((f: FileItem) => ({ kind: 'file' as const, data: f }));
      const folderItems: TrashItem[] = (res.data.folders ?? []).map((f: FolderItem) => ({ kind: 'folder' as const, data: f }));
      setItems([...folderItems, ...fileItems]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function restoreItem(id: string, kind: 'file' | 'folder') {
    try {
      if (kind === 'file') {
        await api.post(`/files/${id}/restore`);
      } else {
        await api.post(`/folders/${id}/restore`);
      }
      showToast('Restored successfully!');
      load();
    } catch {
      showToast('Failed to restore.', 'error');
    }
  }

  async function permanentDelete(id: string, kind: 'file' | 'folder') {
    try {
      if (kind === 'file') {
        await api.delete(`/files/${id}/permanent`);
        showToast('File permanently deleted.');
      } else {
        // Folders don't have a separate permanent delete — empty trash covers them
        showToast('Use "Empty trash" to delete folders permanently.');
      }
      load();
    } catch {
      showToast('Failed to delete.', 'error');
    }
  }

  async function emptyTrash() {
    try {
      await api.delete('/files/trash/empty');
      showToast('Trash emptied.');
      load();
    } catch {
      showToast('Failed to empty trash.', 'error');
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Trash</h1>
          <p className="text-sm text-slate-mid dark:text-slate-400 mt-1">
            Files and folders here can be restored or permanently deleted.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <span className="text-xs text-slate-mid bg-white dark:bg-slate-800 border border-slate-light dark:border-slate-700 rounded-full px-3 py-1">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          )}
          {items.length > 0 && (
            <button
              onClick={() => setConfirmEmptyTrash(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 border border-red-200
                         rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <IconTrash /> Empty trash
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-20 h-20 rounded-3xl bg-brand-bg flex items-center justify-center mb-4 text-slate-mid">
            <IconTrash />
          </div>
          <p className="text-slate-dark dark:text-slate-100 font-semibold text-lg">Trash is empty</p>
          <p className="text-slate-mid dark:text-slate-400 text-sm mt-1">Deleted files and folders will appear here.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
          {items.map((item, i) => {
            const isFolder = item.kind === 'folder';
            const { bg, color } = isFolder
              ? { bg: '#edf3f9', color: '#2da2fd' }
              : mimeColor((item.data as FileItem).mime_type);

            return (
              <div
                key={`${item.kind}-${item.data.id}`}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-red-50/40 dark:hover:bg-red-900/10 transition group
                            ${i !== items.length - 1 ? 'border-b border-slate-light/60 dark:border-slate-700/60' : ''}`}
              >
                {/* icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 opacity-60"
                  style={{ background: bg, color }}>
                  {isFolder
                    ? <IconFolder />
                    : <FileIcon mime={(item.data as FileItem).mime_type} />}
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate line-through opacity-60">
                    {item.data.name}
                  </p>
                  <p className="text-xs text-slate-mid dark:text-slate-400">
                    {isFolder ? 'Folder' : formatBytes((item.data as FileItem).size)}
                    {' · '}deleted {timeAgo(item.data.updated_at)}
                  </p>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button
                    onClick={() => restoreItem(item.data.id, item.kind)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-brand text-brand
                               hover:bg-brand hover:text-white transition font-medium"
                  >
                    Restore
                  </button>
                  {item.kind === 'file' && (
                    <button
                      onClick={() => setConfirm({ id: item.data.id, kind: item.kind })}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500
                                 hover:bg-red-500 hover:text-white transition font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permanent delete confirm */}
      {confirm && (
        <ConfirmDialog
          message="Permanently delete this file? This cannot be undone."
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const { id, kind } = confirm;
            setConfirm(null);
            await permanentDelete(id, kind);
          }}
        />
      )}

      {/* Empty trash confirm */}
      {confirmEmptyTrash && (
        <ConfirmDialog
          message={`Permanently delete all ${items.length} item${items.length !== 1 ? 's' : ''} in trash? This cannot be undone.`}
          onCancel={() => setConfirmEmptyTrash(false)}
          onConfirm={async () => {
            setConfirmEmptyTrash(false);
            await emptyTrash();
          }}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </DashboardLayout>
  );
}

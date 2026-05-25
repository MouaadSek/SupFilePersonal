'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { getApiBase } from '@/lib/apiBase';
import { IconFolder, IconFile, IconImage, IconVideo, IconMusic, IconChevronRight } from '@/components/icons';

interface FileItem {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  updated_at: string;
  folder_id: string | null;
  starred: boolean;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  updated_at: string;
  item_count?: number;
  starred: boolean;
}

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

function mimeColor(mime: string) {
  if (mime.startsWith('image/')) return { bg: '#edf3f9', color: '#2da2fd' };
  if (mime.startsWith('video/')) return { bg: '#e8f7ff', color: '#3cb5ff' };
  if (mime.startsWith('audio/')) return { bg: '#f3f4f6', color: '#858c92' };
  return { bg: '#f0f2f4', color: '#364751' };
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <IconImage />;
  if (mime.startsWith('video/')) return <IconVideo />;
  if (mime.startsWith('audio/')) return <IconMusic />;
  return <IconFile />;
}

function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('supfile_token') ?? '') : '';
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 dark:bg-slate-700/60 ${className}`} />;
}

export default function FavoritesPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/favorites')
      .then(res => {
        setFiles(res.data.files ?? []);
        setFolders(res.data.folders ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function removeStar(type: 'file' | 'folder', id: string) {
    await api.post(`/favorites/${type}s/${id}`).catch(() => {});
    if (type === 'file') setFiles(prev => prev.filter(f => f.id !== id));
    else setFolders(prev => prev.filter(f => f.id !== id));
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Favorites</h1>
        <p className="text-sm text-slate-mid dark:text-slate-400 mt-1">Your starred files and folders</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#2da2fd" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-60">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <p className="text-slate-dark dark:text-slate-100 font-semibold text-lg">No favorites yet</p>
          <p className="text-slate-mid dark:text-slate-400 text-sm mt-1">
            Star files and folders to find them quickly here.
          </p>
          <button onClick={() => router.push('/files')}
            className="mt-5 px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-light transition">
            Browse Files
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {folders.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-mid uppercase tracking-wider mb-3">
                Folders ({folders.length})
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
                {folders.map((f, i) => (
                  <div key={f.id}
                    className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3.5 hover:bg-brand-bg/50 dark:hover:bg-slate-700/50 transition group cursor-pointer
                                ${i !== folders.length - 1 ? 'border-b border-slate-light/60 dark:border-slate-700/60' : ''}`}
                    onClick={() => router.push(`/files?folder=${f.id}`)}>
                    <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                      <IconFolder />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{f.name}</p>
                      <p className="text-xs text-slate-mid dark:text-slate-400">
                        {(f.item_count ?? 0) === 1 ? '1 item' : `${f.item_count ?? 0} items`} · {timeAgo(f.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeStar('folder', f.id); }}
                      title="Remove from favorites"
                      className="text-amber-400 hover:text-slate-mid transition p-1.5 rounded opacity-0 group-hover:opacity-100">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                    <span className="text-slate-mid dark:text-slate-500 opacity-0 group-hover:opacity-100 transition">
                      <IconChevronRight />
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {files.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-mid uppercase tracking-wider mb-3">
                Files ({files.length})
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
                {files.map((f, i) => {
                  const { bg, color } = mimeColor(f.mime_type);
                  return (
                    <div key={f.id}
                      className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3.5 hover:bg-brand-bg/50 dark:hover:bg-slate-700/50 transition group
                                  ${i !== files.length - 1 ? 'border-b border-slate-light/60 dark:border-slate-700/60' : ''}`}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ background: bg, color }}>
                        {f.mime_type.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${getApiBase()}/files/${f.id}/preview?access_token=${encodeURIComponent(getToken())}`}
                            alt={f.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : <FileIcon mime={f.mime_type} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{f.name}</p>
                        <p className="text-xs text-slate-mid dark:text-slate-400">{formatBytes(f.size)} · {timeAgo(f.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <a href={`${getApiBase()}/files/${f.id}/download?token=${getToken()}`}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-light dark:border-slate-600 text-slate-mid dark:text-slate-400 hover:border-brand hover:text-brand transition">
                          Download
                        </a>
                        <button
                          onClick={() => removeStar('file', f.id)}
                          title="Remove from favorites"
                          className="text-amber-400 hover:text-slate-mid transition p-1.5 rounded">
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
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
    </DashboardLayout>
  );
}

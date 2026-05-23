'use client';

import { useState, useEffect } from 'react';

import { getApiBase } from '@/lib/apiBase';

interface ShareResource {
  id: string;
  name: string;
  mime_type?: string;
  size?: number;
}

interface FolderFile {
  id: string;
  name: string;
  mime_type?: string;
  size?: number;
  created_at?: string;
}

interface ShareData {
  type: 'file' | 'folder';
  resource: ShareResource;
  files?: FolderFile[];
}

type PageState = 'loading' | 'protected' | 'expired' | 'not_found' | 'error' | 'ready';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const gb = bytes / 1_073_741_824;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1_048_576;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function isPreviewable(mime?: string): boolean {
  if (!mime) return false;
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    mime === 'application/pdf' ||
    mime.startsWith('text/') ||
    mime === 'application/json'
  );
}

function PreviewPanel({ mime, url }: { mime: string; url: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (mime === 'application/pdf') {
      setFetching(true);
      fetch(url)
        .then((r) => r.blob())
        .then((b) => setBlobUrl(URL.createObjectURL(b)))
        .catch(() => setBlobUrl(null))
        .finally(() => setFetching(false));
    } else if (mime.startsWith('text/') || mime === 'application/json') {
      setFetching(true);
      fetch(url)
        .then((r) => r.text())
        .then((t) => setText(t))
        .catch(() => setText(null))
        .finally(() => setFetching(false));
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url, mime]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mime.startsWith('image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Preview"
        className="max-w-full max-h-[65vh] rounded-xl object-contain mx-auto block"
      />
    );
  }

  if (mime.startsWith('video/')) {
    return (
      <video
        controls
        src={url}
        className="max-w-full max-h-[65vh] rounded-xl mx-auto block"
      />
    );
  }

  if (mime.startsWith('audio/')) {
    return (
      <div className="w-full px-2 py-4">
        <audio controls src={url} className="w-full" />
      </div>
    );
  }

  if (mime === 'application/pdf') {
    if (fetching) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
        </div>
      );
    }
    if (blobUrl) {
      return (
        <iframe
          src={blobUrl}
          title="PDF Preview"
          className="w-full h-[65vh] rounded-xl border-0"
        />
      );
    }
    return null;
  }

  if (mime.startsWith('text/') || mime === 'application/json') {
    if (fetching) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
        </div>
      );
    }
    if (text !== null) {
      return (
        <pre className="w-full max-h-[65vh] overflow-auto text-left text-xs font-mono
                        bg-slate-50 border border-slate-200 rounded-xl p-4
                        text-slate-700 whitespace-pre-wrap break-words">
          {text}
        </pre>
      );
    }
  }

  return null;
}

export default function SharePage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [password, setPassword] = useState('');
  const [verifiedPw, setVerifiedPw] = useState<string | null>(null);
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const res = await fetch(`${getApiBase()}/shares/${token}`);
      if (res.status === 404) { setPageState('not_found'); return; }
      if (res.status === 410) { setPageState('expired'); return; }
      if (res.status === 403) { setPageState('protected'); return; }
      if (!res.ok) { setPageState('error'); return; }
      setShareData(await res.json());
      setPageState('ready');
    }
    init();
  }, [token]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const pw = password.trim();
    if (!pw) return;
    setPwLoading(true);
    setPwError('');

    const res = await fetch(`${getApiBase()}/shares/${token}?password=${encodeURIComponent(pw)}`);
    const data = await res.json();

    if (res.status === 403) {
      setPwError('Incorrect password. Please try again.');
    } else if (res.ok) {
      setShareData(data as ShareData);
      setVerifiedPw(pw);
      setPageState('ready');
    } else {
      setPwError('Something went wrong. Please try again.');
    }
    setPwLoading(false);
  }

  function getDownloadUrl() {
    const base = `${getApiBase()}/shares/${token}/download`;
    return verifiedPw ? `${base}?password=${encodeURIComponent(verifiedPw)}` : base;
  }

  function getFileDownloadUrl(fileId: string) {
    const params = new URLSearchParams({ file_id: fileId });
    if (verifiedPw) params.set('password', verifiedPw);
    return `${getApiBase()}/shares/${token}/download?${params.toString()}`;
  }

  function mimeIcon(mime?: string): string {
    if (!mime) return '📄';
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.startsWith('video/')) return '🎬';
    if (mime.startsWith('audio/')) return '🎵';
    if (mime === 'application/pdf') return '📄';
    if (mime.startsWith('text/') || mime === 'application/json') return '📝';
    return '📁';
  }

  const canPreview =
    pageState === 'ready' &&
    shareData?.type === 'file' &&
    isPreviewable(shareData.resource.mime_type);

  const isFolder = pageState === 'ready' && shareData?.type === 'folder';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800">
          <span className="text-blue-500">SUP</span>File
        </h1>
        <p className="text-slate-500 text-sm mt-1">Secure file sharing</p>
      </div>

      <div className={`w-full transition-all ${canPreview || isFolder ? 'max-w-3xl' : 'max-w-md'}`}>
        {pageState === 'loading' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-slate-500 text-sm">Loading shared content…</p>
          </div>
        )}

        {pageState === 'not_found' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center">
            <p className="text-4xl mb-4">🔗</p>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Link not found</h2>
            <p className="text-slate-500 text-sm">This share link does not exist or has been revoked.</p>
          </div>
        )}

        {pageState === 'expired' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center">
            <p className="text-4xl mb-4">⏰</p>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">This link has expired</h2>
            <p className="text-slate-500 text-sm">
              The owner can create a new link if you still need access.
            </p>
          </div>
        )}

        {pageState === 'error' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-slate-500 text-sm">Could not load this share link. Please try again later.</p>
          </div>
        )}

        {pageState === 'protected' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <div className="text-center mb-6">
              <p className="text-4xl mb-3">🔒</p>
              <h2 className="text-xl font-semibold text-slate-800">Password required</h2>
              <p className="text-slate-500 text-sm mt-1">This link is password-protected.</p>
            </div>

            {pwError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {pwError}
              </div>
            )}

            <form onSubmit={submitPassword} className="space-y-4">
              <input
                autoFocus
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                           text-sm placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!password.trim() || pwLoading}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium text-sm
                           hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pwLoading ? 'Verifying…' : 'Unlock'}
              </button>
            </form>
          </div>
        )}

        {pageState === 'ready' && shareData && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-600" />

            <div className="p-6">
              {/* File info */}
              <div className="flex items-start gap-4 mb-5">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                  {!shareData.resource.mime_type && '📂'}
                  {shareData.resource.mime_type?.startsWith('image/') && '🖼️'}
                  {shareData.resource.mime_type?.startsWith('video/') && '🎬'}
                  {shareData.resource.mime_type?.startsWith('audio/') && '🎵'}
                  {shareData.resource.mime_type === 'application/pdf' && '📄'}
                  {shareData.resource.mime_type?.startsWith('text/') && '📝'}
                  {shareData.resource.mime_type === 'application/json' && '📝'}
                  {shareData.resource.mime_type &&
                    !shareData.resource.mime_type.startsWith('image/') &&
                    !shareData.resource.mime_type.startsWith('video/') &&
                    !shareData.resource.mime_type.startsWith('audio/') &&
                    !shareData.resource.mime_type.startsWith('text/') &&
                    shareData.resource.mime_type !== 'application/pdf' &&
                    shareData.resource.mime_type !== 'application/json' &&
                    '📁'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-slate-800 break-all leading-snug">
                    {shareData.resource.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {shareData.type === 'file' ? (
                      <>
                        <span className="capitalize">
                          {shareData.resource.mime_type?.split('/')[1] ?? 'file'}
                        </span>
                        {shareData.resource.size !== undefined && (
                          <> · {formatBytes(shareData.resource.size)}</>
                        )}
                      </>
                    ) : (
                      'Shared folder'
                    )}
                  </p>
                </div>

                {shareData.type === 'file' && (
                  <a
                    href={getDownloadUrl()}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white
                               rounded-xl font-medium text-sm hover:bg-blue-600 transition"
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </a>
                )}
              </div>

              {/* Inline preview */}
              {shareData.type === 'file' && isPreviewable(shareData.resource.mime_type) && (
                <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                  <PreviewPanel
                    mime={shareData.resource.mime_type!}
                    url={getDownloadUrl()}
                  />
                </div>
              )}

              {shareData.type === 'folder' && (
                <div className="mt-1">
                  {!shareData.files || shareData.files.length === 0 ? (
                    <div className="px-4 py-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-sm text-center">
                      This folder is empty.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                      {shareData.files.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition"
                        >
                          <span className="text-xl shrink-0">{mimeIcon(f.mime_type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                            {f.size !== undefined && (
                              <p className="text-xs text-slate-400">{formatBytes(f.size)}</p>
                            )}
                          </div>
                          <a
                            href={getFileDownloadUrl(f.id)}
                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white
                                       rounded-lg font-medium text-xs hover:bg-blue-600 transition"
                          >
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    {shareData.files.length} file{shareData.files.length !== 1 ? 's' : ''} in this folder
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Shared via SUPFile &mdash; secure cloud storage
      </p>
    </div>
  );
}

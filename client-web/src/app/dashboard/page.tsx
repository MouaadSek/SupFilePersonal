'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard, type RecentFile } from '@/hooks/useDashboard';
import {
  IconFile, IconImage, IconVideo, IconMusic, IconUpload, IconChevronRight,
} from '@/components/icons';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const gb = bytes / 1_073_741_824;
  if (gb >= 1)  return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1_048_576;
  if (mb >= 1)  return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1_024;
  return `${kb.toFixed(0)} KB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function mimeCategory(mime: string) {
  if (mime.startsWith('image/'))  return 'image';
  if (mime.startsWith('video/'))  return 'video';
  if (mime.startsWith('audio/'))  return 'audio';
  return 'file';
}

const CATEGORY_META = {
  image: { label: 'Images',    color: '#2da2fd', bg: '#edf3f9', Icon: IconImage  },
  video: { label: 'Videos',    color: '#3cb5ff', bg: '#e8f7ff', Icon: IconVideo  },
  audio: { label: 'Audio',     color: '#858c92', bg: '#f3f4f6', Icon: IconMusic  },
  file:  { label: 'Documents', color: '#364751', bg: '#f0f2f4', Icon: IconFile   },
};

// ─── Quota Ring (pure SVG) ───────────────────────────────────────────────────

function QuotaRing({ used, total }: { used: number; total: number }) {
  const pct     = Math.min(100, (used / total) * 100);
  const R        = 56;
  const circ     = 2 * Math.PI * R;
  const dash     = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={136} height={136} className="-rotate-90">
        {/* track */}
        <circle cx={68} cy={68} r={R} fill="none" stroke="#edf3f9" strokeWidth={12} />
        {/* fill */}
        <circle
          cx={68} cy={68} r={R}
          fill="none"
          stroke="#2da2fd"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      {/* centre text */}
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-dark">{Math.round(pct)}%</span>
        <span className="text-xs text-slate-mid">used</span>
      </div>
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 ${className}`} />;
}

// ─── File row ────────────────────────────────────────────────────────────────

function FileRow({ file }: { file: RecentFile }) {
  const cat  = mimeCategory(file.mime_type);
  const meta = CATEGORY_META[cat];
  const { Icon } = meta;

  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-brand-bg/60 rounded-xl transition-colors group cursor-pointer">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: meta.bg, color: meta.color }}
      >
        <Icon />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-dark truncate">{file.name}</p>
        <p className="text-xs text-slate-mid">{formatBytes(file.size)} · {timeAgo(file.updated_at)}</p>
      </div>
      <span className="text-slate-light group-hover:text-slate-mid transition-colors">
        <IconChevronRight />
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { quota, recent, loading: dataLoading } = useDashboard();

  const quotaUsed  = Number(quota?.quota_used  ?? 0);
  const quotaTotal = Number(quota?.quota_total ?? 32212254720);

  // derive storage breakdown from recent files (mock until we add a real endpoint)
  const breakdown = Object.entries(
    recent.reduce<Record<string, { count: number; size: number }>>((acc, f) => {
      const k = mimeCategory(f.mime_type);
      acc[k] = acc[k] ?? { count: 0, size: 0 };
      acc[k].count++;
      acc[k].size += Number(f.size);
      return acc;
    }, {})
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-dark">
          {greeting()}, {user?.display_name || 'there'} 👋
        </h1>
        <p className="text-slate-mid mt-1 text-sm">Here's what's happening with your files today.</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Storage */}
        <div className="bg-white rounded-2xl border border-slate-light p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <IconUpload />
          </div>
          <div>
            <p className="text-xs text-slate-mid uppercase tracking-wide font-medium">Storage used</p>
            {dataLoading
              ? <Skeleton className="h-6 w-20 mt-1" />
              : <p className="text-xl font-bold text-slate-dark">{formatBytes(quotaUsed)}</p>}
            <p className="text-xs text-slate-mid">of {formatBytes(quotaTotal)}</p>
          </div>
        </div>

        {/* Files */}
        <div className="bg-white rounded-2xl border border-slate-light p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <IconFile />
          </div>
          <div>
            <p className="text-xs text-slate-mid uppercase tracking-wide font-medium">Recent files</p>
            {dataLoading
              ? <Skeleton className="h-6 w-12 mt-1" />
              : <p className="text-xl font-bold text-slate-dark">{recent.length}</p>}
            <p className="text-xs text-slate-mid">last 5 modified</p>
          </div>
        </div>

        {/* Quota % */}
        <div className="bg-white rounded-2xl border border-slate-light p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-pale/40 flex items-center justify-center shrink-0">
            <span className="text-brand font-bold text-sm">
              {dataLoading ? '—' : `${Math.round((quotaUsed / quotaTotal) * 100)}%`}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-mid uppercase tracking-wide font-medium">Quota</p>
            {dataLoading
              ? <Skeleton className="h-4 w-24 mt-1" />
              : (
                <div className="mt-1.5 h-1.5 bg-brand-bg rounded-full w-32 overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (quotaUsed / quotaTotal) * 100)}%` }}
                  />
                </div>
              )}
            <p className="text-xs text-slate-mid mt-1">{formatBytes(quotaTotal - quotaUsed)} free</p>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Storage ring + breakdown */}
        <div className="bg-white rounded-2xl border border-slate-light p-6 flex flex-col">
          <h2 className="text-base font-semibold text-slate-dark mb-6">Storage Overview</h2>

          <div className="flex justify-center mb-6">
            {dataLoading
              ? <Skeleton className="w-[136px] h-[136px] rounded-full" />
              : <QuotaRing used={quotaUsed} total={quotaTotal} />}
          </div>

          <div className="space-y-3 mt-auto">
            {dataLoading
              ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)
              : breakdown.length > 0
                ? breakdown.map(([cat, { count, size }]) => {
                    const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
                    const { Icon } = meta;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.bg, color: meta.color }}>
                          <svg width={14} height={14}><Icon /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-dark font-medium">{meta.label}</span>
                            <span className="text-slate-mid">{count} file{count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="h-1 bg-brand-bg rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (size / quotaTotal) * 100 * 200)}%`, background: meta.color }} />
                          </div>
                        </div>
                        <span className="text-xs text-slate-mid shrink-0">{formatBytes(size)}</span>
                      </div>
                    );
                  })
                : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-mid">No files yet</p>
                    <p className="text-xs text-slate-light mt-1">Upload your first file to see the breakdown</p>
                  </div>
                )}
          </div>
        </div>

        {/* Recent files */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-light p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-dark">Recent Files</h2>
            <a href="/files" className="text-xs text-brand font-medium hover:text-brand-light transition">View all →</a>
          </div>

          {dataLoading
            ? <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            : recent.length > 0
              ? (
                <div className="divide-y divide-slate-light/50 -mx-2">
                  {recent.map((f) => <FileRow key={f.id} file={f} />)}
                </div>
              )
              : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-4 text-brand">
                    <IconFile />
                  </div>
                  <p className="text-slate-dark font-medium">No files yet</p>
                  <p className="text-sm text-slate-mid mt-1 mb-4">Upload your first file to get started</p>
                  <a
                    href="/files"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-light transition"
                  >
                    <IconUpload />
                    Upload a file
                  </a>
                </div>
              )}
        </div>

      </div>
    </DashboardLayout>
  );
}

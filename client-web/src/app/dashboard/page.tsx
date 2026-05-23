'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard, type RecentFile } from '@/hooks/useDashboard';
import api from '@/lib/api';
<<<<<<< HEAD
=======
import { useRouter } from 'next/navigation';
>>>>>>> origin/mouaad
import {
  IconFile, IconImage, IconVideo, IconMusic, IconUpload, IconChevronRight,
} from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreakdownItem {
  category: string;
  count: number;
  total_size: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const gb = bytes / 1_073_741_824;
  if (gb >= 1)  return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1_048_576;
  if (mb >= 1)  return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1_024).toFixed(0)} KB`;
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

function mimeCategory(mime: string) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

const CATEGORY_META = {
  image:  { label: 'Images',    color: '#2da2fd', bg: '#edf3f9', Icon: IconImage },
  video:  { label: 'Videos',    color: '#3cb5ff', bg: '#e8f7ff', Icon: IconVideo },
  audio:  { label: 'Audio',     color: '#858c92', bg: '#f3f4f6', Icon: IconMusic },
  file:   { label: 'Documents', color: '#364751', bg: '#f0f2f4', Icon: IconFile  },
};

// Maps the backend category name to CATEGORY_META key
const CATEGORY_COLOR: Record<string, string> = {
  Images:    '#2da2fd',
  Videos:    '#3cb5ff',
  Audio:     '#858c92',
  Documents: '#364751',
  Other:     '#cdd0d3',
};

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(
  cx: number, cy: number,
  R: number, ri: number,
  startDeg: number, endDeg: number
): string {
  // Clamp so a 100 % slice doesn't degenerate
  const clamped = Math.min(endDeg - startDeg, 359.99);
  const end = startDeg + clamped;
  const large = clamped > 180 ? 1 : 0;
  const s  = polarToXY(cx, cy, R,  startDeg);
  const e  = polarToXY(cx, cy, R,  end);
  const si = polarToXY(cx, cy, ri, end);
  const ei = polarToXY(cx, cy, ri, startDeg);
  return [
    `M ${s.x} ${s.y}`,
    `A ${R}  ${R}  0 ${large} 1 ${e.x}  ${e.y}`,
    `L ${si.x} ${si.y}`,
    `A ${ri} ${ri} 0 ${large} 0 ${ei.x} ${ei.y}`,
    'Z',
  ].join(' ');
}

function DonutChart({ items }: { items: BreakdownItem[] }) {
  const total = items.reduce((s, d) => s + Number(d.total_size), 0);
  if (total === 0) {
    return (
      <div className="w-28 h-28 rounded-full border-8 border-slate-light/40 flex items-center justify-center">
        <span className="text-xs text-slate-mid">empty</span>
      </div>
    );
  }

  const CX = 60, CY = 60, R = 52, RI = 34;
  let cursor = 0;

  const segments = items.map((item) => {
    const frac = Number(item.total_size) / total;
    const startDeg = cursor;
    cursor += frac * 360;
    return { item, path: donutArc(CX, CY, R, RI, startDeg, cursor) };
  });

  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28 drop-shadow-sm">
      {segments.map(({ item, path }) => (
        <path
          key={item.category}
          d={path}
          fill={CATEGORY_COLOR[item.category] ?? '#cdd0d3'}
          className="transition-all duration-500"
        />
      ))}
    </svg>
  );
}

// ─── Quota Ring (pure SVG) ────────────────────────────────────────────────────

function QuotaRing({ used, total }: { used: number; total: number }) {
  const pct  = Math.min(100, (used / total) * 100);
  const R    = 56;
  const circ = 2 * Math.PI * R;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={136} height={136} className="-rotate-90">
        <circle cx={68} cy={68} r={R} fill="none" stroke="#edf3f9" strokeWidth={12} />
        <circle cx={68} cy={68} r={R} fill="none" stroke="#2da2fd" strokeWidth={12}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-dark dark:text-slate-100">{Math.round(pct)}%</span>
        <span className="text-xs text-slate-mid dark:text-slate-400">used</span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 dark:bg-slate-700/60 ${className}`} />;
}

// ─── File row ─────────────────────────────────────────────────────────────────

function FileRow({ file }: { file: RecentFile }) {
<<<<<<< HEAD
=======
  const router = useRouter();
>>>>>>> origin/mouaad
  const cat  = mimeCategory(file.mime_type);
  const meta = CATEGORY_META[cat];
  const { Icon } = meta;
  return (
<<<<<<< HEAD
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-brand-bg/60 dark:hover:bg-slate-700/50
                    rounded-xl transition-colors group cursor-pointer">
=======
    <div
      onClick={() => router.push('/files')}
      className="flex items-center gap-4 py-3 px-4 hover:bg-brand-bg/60 dark:hover:bg-slate-700/50
                  rounded-xl transition-colors group cursor-pointer"
    >
>>>>>>> origin/mouaad
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: meta.bg, color: meta.color }}>
        <Icon />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{file.name}</p>
        <p className="text-xs text-slate-mid dark:text-slate-400">{formatBytes(file.size)} · {timeAgo(file.updated_at)}</p>
      </div>
<<<<<<< HEAD
      <span className="text-slate-light dark:text-slate-600 group-hover:text-slate-mid dark:group-hover:text-slate-400 transition-colors">
=======
      <span className="text-slate-light dark:text-slate-600 group-hover:text-brand dark:group-hover:text-brand transition-colors">
>>>>>>> origin/mouaad
        <IconChevronRight />
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { quota, recent, loading: dataLoading } = useDashboard();

  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/breakdown')
      .then((res) => setBreakdown(res.data))
      .catch(() => {})
      .finally(() => setBreakdownLoading(false));
  }, []);

  const quotaUsed  = Number(quota?.quota_used  ?? 0);
  const quotaTotal = Number(quota?.quota_total ?? 32_212_254_720);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">
          {greeting()}, {user?.display_name || 'there'} 👋
        </h1>
        <p className="text-slate-mid dark:text-slate-400 mt-1 text-sm">
          Here&apos;s what&apos;s happening with your files today.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
<<<<<<< HEAD
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-5 flex items-center gap-4">
=======
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 border-l-[3px] border-l-brand p-5 flex items-center gap-4">
>>>>>>> origin/mouaad
          <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <IconUpload />
          </div>
          <div>
            <p className="text-xs text-slate-mid dark:text-slate-400 uppercase tracking-wide font-medium">Storage used</p>
            {dataLoading
              ? <Skeleton className="h-6 w-20 mt-1" />
              : <p className="text-xl font-bold text-slate-dark dark:text-slate-100">{formatBytes(quotaUsed)}</p>}
            <p className="text-xs text-slate-mid dark:text-slate-400">of {formatBytes(quotaTotal)}</p>
          </div>
        </div>

<<<<<<< HEAD
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-5 flex items-center gap-4">
=======
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 border-l-[3px] border-l-brand-light p-5 flex items-center gap-4">
>>>>>>> origin/mouaad
          <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <IconFile />
          </div>
          <div>
            <p className="text-xs text-slate-mid dark:text-slate-400 uppercase tracking-wide font-medium">Recent files</p>
            {dataLoading
              ? <Skeleton className="h-6 w-12 mt-1" />
              : <p className="text-xl font-bold text-slate-dark dark:text-slate-100">{recent.length}</p>}
            <p className="text-xs text-slate-mid dark:text-slate-400">last 5 modified</p>
          </div>
        </div>

<<<<<<< HEAD
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-5 flex items-center gap-4">
=======
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 border-l-[3px] border-l-brand-pale p-5 flex items-center gap-4">
>>>>>>> origin/mouaad
          <div className="w-12 h-12 rounded-xl bg-brand-pale/40 flex items-center justify-center shrink-0">
            <span className="text-brand font-bold text-sm">
              {dataLoading ? '—' : `${Math.round((quotaUsed / quotaTotal) * 100)}%`}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-mid dark:text-slate-400 uppercase tracking-wide font-medium">Quota</p>
            {dataLoading
              ? <Skeleton className="h-4 w-24 mt-1" />
              : (
                <div className="mt-1.5 h-1.5 bg-brand-bg dark:bg-slate-700 rounded-full w-32 overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (quotaUsed / quotaTotal) * 100)}%` }} />
                </div>
              )}
            <p className="text-xs text-slate-mid dark:text-slate-400 mt-1">{formatBytes(quotaTotal - quotaUsed)} free</p>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Storage breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 flex flex-col">
          <h2 className="text-base font-semibold text-slate-dark dark:text-slate-100 mb-5">Storage Breakdown</h2>

          {/* Donut chart */}
          <div className="flex justify-center mb-5">
            {breakdownLoading
              ? <Skeleton className="w-28 h-28 rounded-full" />
              : <DonutChart items={breakdown} />}
          </div>

          {/* Legend */}
          <div className="space-y-2.5">
            {breakdownLoading
              ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)
              : breakdown.length > 0
                ? breakdown.map((item) => {
                    const color = CATEGORY_COLOR[item.category] ?? '#cdd0d3';
                    const total = breakdown.reduce((s, d) => s + Number(d.total_size), 0);
                    const pct   = total > 0 ? Math.round((Number(item.total_size) / total) * 100) : 0;
                    return (
                      <div key={item.category} className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="flex-1 text-xs font-medium text-slate-dark dark:text-slate-200 truncate">
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-mid dark:text-slate-400">
                          {item.count} file{item.count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs font-semibold text-slate-dark dark:text-slate-200 w-10 text-right">
                          {pct}%
                        </span>
                        <span className="text-xs text-slate-mid dark:text-slate-400 w-16 text-right">
                          {formatBytes(Number(item.total_size))}
                        </span>
                      </div>
                    );
                  })
                : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-mid dark:text-slate-400">No files yet</p>
                    <p className="text-xs text-slate-light dark:text-slate-600 mt-1">
                      Upload files to see the breakdown
                    </p>
                  </div>
                )}
          </div>

          {/* Divider + quota ring below */}
          {!breakdownLoading && breakdown.length > 0 && (
            <>
              <hr className="my-5 border-slate-light dark:border-slate-700" />
              <h3 className="text-sm font-semibold text-slate-dark dark:text-slate-100 mb-4 text-center">Quota</h3>
              <div className="flex justify-center">
                {dataLoading
                  ? <Skeleton className="w-[136px] h-[136px] rounded-full" />
                  : <QuotaRing used={quotaUsed} total={quotaTotal} />}
              </div>
            </>
          )}
        </div>

        {/* Recent files */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-dark dark:text-slate-100">Recent Files</h2>
            <a href="/files" className="text-xs text-brand font-medium hover:text-brand-light transition">
              View all →
            </a>
          </div>

          {dataLoading
            ? <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            : recent.length > 0
              ? (
                <div className="divide-y divide-slate-light/50 dark:divide-slate-700/50 -mx-2">
                  {recent.map((f) => <FileRow key={f.id} file={f} />)}
                </div>
              )
              : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-brand-bg dark:bg-slate-700 flex items-center justify-center mb-4 text-brand">
                    <IconFile />
                  </div>
                  <p className="text-slate-dark dark:text-slate-100 font-medium">No files yet</p>
                  <p className="text-sm text-slate-mid dark:text-slate-400 mt-1 mb-4">Upload your first file to get started</p>
                  <a href="/files"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm
                               font-medium rounded-xl hover:bg-brand-light transition">
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

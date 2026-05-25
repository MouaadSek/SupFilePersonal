'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import api, { type User } from '@/lib/api';
import {
  IconDashboard, IconFolder, IconFile, IconShare, IconTrash,
  IconSettings, IconLogout,
} from './icons';

function IconStar() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

interface Suggestion {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  folder_id?: string | null;
}

interface Props {
  children: ReactNode;
  user: User | null;
  onLogout: () => void;
}

const NAV = [
  { href: '/dashboard',  label: 'Dashboard', Icon: IconDashboard },
  { href: '/files',      label: 'My Files',  Icon: IconFolder },
  { href: '/favorites',  label: 'Favorites', Icon: IconStar },
  { href: '/shared',     label: 'Shared',    Icon: IconShare },
  { href: '/trash',      label: 'Trash',     Icon: IconTrash },
  { href: '/settings',   label: 'Settings',  Icon: IconSettings },
];

function formatBytes(bytes: number) {
  const gb = bytes / 1_073_741_824;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1_048_576).toFixed(0)} MB`;
}

export default function DashboardLayout({ children, user, onLogout }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(-1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const quotaUsed  = Number(user?.quota_used  ?? 0);
  const quotaTotal = Number(user?.quota_total ?? 32212254720);
  const pct = Math.min(100, Math.round((quotaUsed / quotaTotal) * 100));

  useEffect(() => {
    const q = searchVal.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    const timer = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(q)}`)
        .then((res) => {
          const folders: Suggestion[] = (res.data.folders ?? []).slice(0, 3).map(
            (f: { id: string; name: string }) => ({ id: f.id, name: f.name, type: 'folder' as const }),
          );
          const files: Suggestion[] = (res.data.files ?? []).slice(0, 3).map(
            (f: { id: string; name: string; size: number; folder_id: string | null }) => ({
              id: f.id, name: f.name, type: 'file' as const, size: f.size, folder_id: f.folder_id,
            }),
          );
          setSuggestions([...folders, ...files].slice(0, 6));
          setShowSuggest(true);
          setSuggestIdx(-1);
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  useEffect(() => { setAvatarImgError(false); }, [user?.avatar_url]);

  useEffect(() => {
    if (!showSuggest) return;
    function handleOutside(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
        setSuggestIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showSuggest]);

  function navigateToSuggestion(item: Suggestion) {
    setShowSuggest(false);
    setSuggestIdx(-1);
    setSearchVal('');
    if (item.type === 'folder') {
      router.push(`/files?folder=${item.id}`);
    } else {
      router.push(item.folder_id ? `/files?folder=${item.folder_id}` : '/files');
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setShowSuggest(false);
      setSuggestIdx(-1);
    } else if (e.key === 'ArrowDown' && showSuggest) {
      e.preventDefault();
      setSuggestIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && showSuggest) {
      e.preventDefault();
      setSuggestIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && showSuggest && suggestIdx >= 0) {
      e.preventDefault();
      navigateToSuggestion(suggestions[suggestIdx]);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggest(false);
    setSuggestIdx(-1);
    if (searchVal.trim()) router.push(`/files?q=${encodeURIComponent(searchVal.trim())}`);
  }

  return (
    <>
    <div className="flex min-h-screen bg-brand-bg dark:bg-slate-900">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0
                        bg-white dark:bg-slate-800
                        border-r border-slate-light dark:border-slate-700">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-light dark:border-slate-700">
          <Image src="/supfile.png" alt="SUPFile" width={32} height={32} className="rounded-lg" priority />
          <span className="font-bold text-slate-dark dark:text-slate-100 text-lg tracking-tight">SUPFile</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border-l-[3px] ${
                  active
                    ? 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand border-l-brand'
                    : 'text-slate-mid dark:text-slate-400 hover:bg-brand-bg dark:hover:bg-slate-700 hover:text-slate-dark dark:hover:text-slate-100 border-l-transparent'
                }`}
              >
                <span className={active ? 'text-brand' : 'text-slate-mid dark:text-slate-500'}>
                  <Icon />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Quota bar */}
        <div className="px-5 py-4 border-t border-slate-light dark:border-slate-700 space-y-2">
          <div className="flex justify-between text-xs text-slate-mid dark:text-slate-400">
            <span>Storage</span>
            <span>{formatBytes(quotaUsed)} / {formatBytes(quotaTotal)}</span>
          </div>
          <div className="h-1.5 bg-brand-bg dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-mid dark:text-slate-400">{pct}% used</p>
        </div>

        {/* User info — sign-out is in the header avatar dropdown */}
        <div className="px-4 py-4 border-t border-slate-light dark:border-slate-700 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold text-sm">
            {user?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">
              {user?.display_name || 'User'}
            </p>
            <p className="text-xs text-slate-mid dark:text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-light dark:border-slate-700 px-6 py-4 flex items-center gap-4">
          <div className="md:hidden flex items-center gap-3 mr-2">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="text-slate-mid dark:text-slate-400 hover:text-slate-dark dark:hover:text-slate-100 transition"
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Image src="/supfile.png" alt="SUPFile" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-slate-dark dark:text-slate-100">SUPFile</span>
          </div>

          <form className="flex-1 max-w-sm" onSubmit={handleSearchSubmit}>
            <div className="relative" ref={searchWrapRef}>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-mid dark:text-slate-400 pointer-events-none">
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggest(true); }}
                placeholder="Search files and folders…"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-light dark:border-slate-600
                           bg-brand-bg dark:bg-slate-700 text-sm text-slate-dark dark:text-slate-100
                           placeholder-slate-mid dark:placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
              {showSuggest && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50
                                bg-white dark:bg-slate-800 rounded-xl shadow-lg
                                border border-slate-light dark:border-slate-700 overflow-hidden">
                  {suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-mid dark:text-slate-400">No results</div>
                  ) : (
                    suggestions.map((item, i) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); navigateToSuggestion(item); }}
                        onMouseEnter={() => setSuggestIdx(i)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition ${
                          i === suggestIdx
                            ? 'bg-brand/10 dark:bg-brand/20'
                            : 'hover:bg-brand-bg dark:hover:bg-slate-700'
                        } ${i > 0 ? 'border-t border-slate-light/60 dark:border-slate-700/60' : ''}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 ${
                          item.type === 'folder'
                            ? 'bg-brand/10 text-brand'
                            : 'bg-slate-light/60 dark:bg-slate-700 text-slate-mid dark:text-slate-400'
                        }`}>
                          {item.type === 'folder' ? <IconFolder /> : <IconFile />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{item.name}</p>
                          {item.type === 'file' && item.size !== undefined && (
                            <p className="text-xs text-slate-mid dark:text-slate-400">{formatBytes(item.size)}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          item.type === 'folder'
                            ? 'bg-brand/10 text-brand dark:bg-brand/20'
                            : 'bg-slate-light/60 dark:bg-slate-700 text-slate-mid dark:text-slate-500'
                        }`}>
                          {item.type === 'folder' ? 'Folder' : 'File'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </form>

          <div className="ml-auto flex items-center gap-4 shrink-0">
          <div className="text-sm text-slate-mid dark:text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>

          {/* Header avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              className="flex items-center rounded-full hover:ring-2 hover:ring-brand/30 transition"
              aria-label="User menu"
            >
              {user?.avatar_url && !avatarImgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')}${user.avatar_url}`}
                  alt={user.display_name}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={() => setAvatarImgError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold text-sm">
                  {user?.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </button>
            {headerMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl
                                border border-slate-light dark:border-slate-700 min-w-44 py-1.5">
                  <div className="px-3 py-2.5 border-b border-slate-light dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">{user?.display_name}</p>
                    <p className="text-xs text-slate-mid dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button onClick={() => { setHeaderMenuOpen(false); onLogout(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500
                               hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left cursor-pointer">
                    <IconLogout />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
          </div>{/* end ml-auto group */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>

    {/* ── Mobile navigation drawer ── */}
    {drawerOpen && (
      <div className="fixed inset-0 z-50 md:hidden">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
        <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-800 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-light dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Image src="/supfile.png" alt="SUPFile" width={28} height={28} className="rounded-lg" />
              <span className="font-bold text-slate-dark dark:text-slate-100">SUPFile</span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="text-slate-mid dark:text-slate-400 hover:text-slate-dark dark:hover:text-slate-100 transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {NAV.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border-l-[3px] ${
                    active
                      ? 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand border-l-brand'
                      : 'text-slate-mid dark:text-slate-400 hover:bg-brand-bg dark:hover:bg-slate-700 hover:text-slate-dark dark:hover:text-slate-100 border-l-transparent'
                  }`}
                >
                  <span className={active ? 'text-brand' : 'text-slate-mid dark:text-slate-500'}>
                    <Icon />
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="px-5 py-4 border-t border-slate-light dark:border-slate-700 space-y-2">
            <div className="flex justify-between text-xs text-slate-mid dark:text-slate-400">
              <span>Storage</span>
              <span>{formatBytes(quotaUsed)} / {formatBytes(quotaTotal)}</span>
            </div>
            <div className="h-1.5 bg-brand-bg dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-slate-mid dark:text-slate-400">{pct}% used</p>
          </div>

        </aside>
      </div>
    )}
    </>
  );
}

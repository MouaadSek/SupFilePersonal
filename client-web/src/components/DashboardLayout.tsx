'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { type User } from '@/lib/api';
import {
  IconDashboard, IconFolder, IconShare, IconTrash,
  IconSettings, IconLogout,
} from './icons';

interface Props {
  children: ReactNode;
  user: User | null;
  onLogout: () => void;
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/files',     label: 'My Files',  Icon: IconFolder },
  { href: '/shared',    label: 'Shared',    Icon: IconShare },
  { href: '/trash',     label: 'Trash',     Icon: IconTrash },
  { href: '/settings',  label: 'Settings',  Icon: IconSettings },
];

function formatBytes(bytes: number) {
  const gb = bytes / 1_073_741_824;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1_048_576).toFixed(0)} MB`;
}

export default function DashboardLayout({ children, user, onLogout }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const quotaUsed  = Number(user?.quota_used  ?? 0);
  const quotaTotal = Number(user?.quota_total ?? 32212254720);
  const pct = Math.min(100, Math.round((quotaUsed / quotaTotal) * 100));

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand ring-1 ring-brand/20 dark:ring-brand/30'
                    : 'text-slate-mid dark:text-slate-400 hover:bg-brand-bg dark:hover:bg-slate-700 hover:text-slate-dark dark:hover:text-slate-100'
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

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-slate-light dark:border-slate-700 flex items-center gap-3">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${user.avatar_url}`}
              alt={user.display_name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold text-sm shrink-0">
              {user?.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">
              {user?.display_name || 'User'}
            </p>
            <p className="text-xs text-slate-mid dark:text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={onLogout}
            aria-label="Logout"
            className="text-slate-mid dark:text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <IconLogout />
          </button>
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
            <div className="relative">
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
                placeholder="Search files and folders…"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-light dark:border-slate-600
                           bg-brand-bg dark:bg-slate-700 text-sm text-slate-dark dark:text-slate-100
                           placeholder-slate-mid dark:placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
          </form>

          <div className="text-sm text-slate-mid dark:text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand'
                      : 'text-slate-mid dark:text-slate-400 hover:bg-brand-bg dark:hover:bg-slate-700 hover:text-slate-dark dark:hover:text-slate-100'
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

          <div className="px-4 py-4 border-t border-slate-light dark:border-slate-700 flex items-center gap-3">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${user.avatar_url}`}
                alt={user.display_name}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-semibold text-sm shrink-0">
                {user?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-dark dark:text-slate-100 truncate">
                {user?.display_name || 'User'}
              </p>
              <p className="text-xs text-slate-mid dark:text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={onLogout}
              aria-label="Logout"
              className="text-slate-mid dark:text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <IconLogout />
            </button>
          </div>
        </aside>
      </div>
    )}
    </>
  );
}

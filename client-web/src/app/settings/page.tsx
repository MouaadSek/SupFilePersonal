'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { getTheme, setTheme } from '@/lib/theme';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 dark:bg-slate-700/60 ${className}`} />;
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium
                  flex items-center gap-2 transition-all duration-300
                  ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
    >
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

function Section({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-light dark:border-slate-700 bg-brand-bg/30 dark:bg-slate-700/30">
        <h2 className="text-base font-semibold text-slate-dark dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-mid dark:text-slate-400 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

// Pill toggle switch
function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2
                  dark:focus:ring-offset-slate-800 cursor-pointer
                  ${isDark ? 'bg-brand' : 'bg-slate-light'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200
                    ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();

  // avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [avatarLoading,  setAvatarLoading]  = useState(false);
  const [avatarRemoved,  setAvatarRemoved]  = useState(false);

  // profile
  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);

  // theme
  const [isDark, setIsDark] = useState(false);

  // avatar image error fallback
  const [avatarImgError, setAvatarImgError] = useState(false);

  // toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  useEffect(() => { setAvatarImgError(false); }, [localAvatarUrl, user?.avatar_url]);

  useEffect(() => {
    setIsDark(getTheme() === 'dark');
  }, []);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLocalAvatarUrl(res.data.avatar_url);
      setAvatarRemoved(false);
      showToast('Avatar updated!', 'success');
    } catch {
      showToast('Failed to upload avatar.', 'error');
    } finally {
      setAvatarLoading(false);
      if (e.target) e.target.value = '';
    }
  }

  async function handleAvatarRemove() {
    setAvatarLoading(true);
    try {
      await api.delete('/users/me/avatar');
      setLocalAvatarUrl(null);
      setAvatarRemoved(true);
      showToast('Avatar removed.', 'success');
    } catch {
      showToast('Failed to remove avatar.', 'error');
    } finally {
      setAvatarLoading(false);
    }
  }

  function handleThemeToggle() {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    setIsDark(!isDark);
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.put('/users/me', { display_name: displayName, email });
      showToast('Profile updated successfully.', 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update profile.';
      showToast(msg, 'error');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { showToast('New passwords do not match.', 'error'); return; }
    if (newPw.length < 8)    { showToast('Password must be at least 8 characters.', 'error'); return; }
    setPwSaving(true);
    try {
      await api.put('/users/me/password', { current_password: currentPw, new_password: newPw });
      showToast('Password changed successfully.', 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change password.';
      showToast(msg, 'error');
    } finally {
      setPwSaving(false);
    }
  }

  const quotaUsed  = Number(user?.quota_used  ?? 0);
  const quotaTotal = Number(user?.quota_total ?? 32212254720);
  const pct = Math.min(100, Math.round((quotaUsed / quotaTotal) * 100));

  function fmtGB(b: number) { return (b / 1_073_741_824).toFixed(2) + ' GB'; }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-mid dark:text-slate-400 mt-1">Manage your account and preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* ── Avatar + name header ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-light dark:border-slate-700 px-6 py-5 flex items-center gap-5">
          {(() => {
            const avatarSrc = avatarRemoved
              ? null
              : localAvatarUrl
                ? `${API_BASE}${localAvatarUrl}`
                : user?.avatar_url
                  ? `${API_BASE}${user.avatar_url}`
                  : null;
            return (
              <>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Click to change avatar"
                  className="relative w-16 h-16 rounded-2xl shrink-0 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {avatarSrc && !avatarImgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="Avatar" className="w-full h-full rounded-2xl object-cover" onError={() => setAvatarImgError(true)} />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-brand/15 flex items-center justify-center text-brand font-bold text-2xl">
                      {user?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  {avatarLoading && (
                    <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    </div>
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </>
            );
          })()}
          <div>
            {authLoading
              ? <><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-4 w-48" /></>
              : <>
                <p className="font-semibold text-slate-dark dark:text-slate-100 text-lg">
                  {user?.display_name || 'No name set'}
                </p>
                <p className="text-sm text-slate-mid dark:text-slate-400">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-mid dark:text-slate-400">Click avatar to change photo</p>
                  {(localAvatarUrl || (!avatarRemoved && user?.avatar_url)) && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={avatarLoading}
                      className="text-xs text-red-400 hover:text-red-600 transition disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </>
            }
          </div>
        </div>

        {/* ── Profile ── */}
        <Section title="Profile" description="Update your display name and email address.">
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
                Display name
              </label>
              <input type="text" className="input-field" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name" autoComplete="name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
                Email address
              </label>
              <input type="email" className="input-field" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={profileSaving}
                className="px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-xl
                           hover:bg-brand-light transition disabled:opacity-50">
                {profileSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Password ── */}
        <Section title="Password" description="Use a strong password of at least 8 characters.">
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
                Current password
              </label>
              <input type="password" className="input-field" value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
                New password
              </label>
              <input type="password" className="input-field" value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters" autoComplete="new-password" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
                Confirm new password
              </label>
              <input type="password"
                className={`input-field ${confirmPw && confirmPw !== newPw ? 'border-red-400 focus:ring-red-400' : ''}`}
                value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password" autoComplete="new-password" required />
            </div>
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={pwSaving}
                className="px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-xl
                           hover:bg-brand-light transition disabled:opacity-50">
                {pwSaving ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </form>
        </Section>

        {/* ── Theme ── */}
        <Section title="Theme" description="Choose between light and dark mode.">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-dark dark:text-slate-100">
                {isDark ? 'Dark mode' : 'Light mode'}
              </p>
              <p className="text-xs text-slate-mid dark:text-slate-400 mt-0.5">
                {isDark ? 'Using dark backgrounds and light text.' : 'Using light backgrounds and dark text.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-mid dark:text-slate-400">
                {isDark ? '🌙' : '☀️'}
              </span>
              <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} />
            </div>
          </div>
        </Section>

        {/* ── Storage ── */}
        <Section title="Storage" description="Your current storage usage.">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-dark dark:text-slate-100 font-medium">{fmtGB(quotaUsed)} used</span>
              <span className="text-slate-mid dark:text-slate-400">{fmtGB(quotaTotal)} total</span>
            </div>
            <div className="h-2 bg-brand-bg dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-slate-mid dark:text-slate-400">{pct}% used · {fmtGB(quotaTotal - quotaUsed)} free</p>
          </div>
        </Section>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </DashboardLayout>
  );
}

'use client';

import { useState, useEffect, type FormEvent } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-light/60 ${className}`} />;
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

// ── Section card wrapper
function Section({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-light overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-light bg-brand-bg/30">
        <h2 className="text-base font-semibold text-slate-dark">{title}</h2>
        <p className="text-sm text-slate-mid mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();

  // profile
  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // password
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwSaving,   setPwSaving]   = useState(false);

  // toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
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
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={logout}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-dark">Settings</h1>
        <p className="text-sm text-slate-mid mt-1">Manage your account and preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* ── Avatar + name header ── */}
        <div className="bg-white rounded-2xl border border-slate-light px-6 py-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand/15 flex items-center justify-center text-brand font-bold text-2xl shrink-0">
            {user?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            {authLoading
              ? <><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-4 w-48" /></>
              : <>
                <p className="font-semibold text-slate-dark text-lg">{user?.display_name || 'No name set'}</p>
                <p className="text-sm text-slate-mid">{user?.email}</p>
              </>
            }
          </div>
        </div>

        {/* ── Profile ── */}
        <Section title="Profile" description="Update your display name and email address.">
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">Display name</label>
              <input
                type="text"
                className="input-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">Email address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
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
              <label className="block text-sm font-medium text-slate-dark mb-1.5">Current password</label>
              <input
                type="password"
                className="input-field"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">New password</label>
              <input
                type="password"
                className="input-field"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">Confirm new password</label>
              <input
                type="password"
                className={`input-field ${confirmPw && confirmPw !== newPw ? 'border-red-400 focus:ring-red-400' : ''}`}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
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

        {/* ── Storage ── */}
        <Section title="Storage" description="Your current storage usage.">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-dark font-medium">{fmtGB(quotaUsed)} used</span>
              <span className="text-slate-mid">{fmtGB(quotaTotal)} total</span>
            </div>
            <div className="h-2 bg-brand-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-mid">{pct}% used · {fmtGB(quotaTotal - quotaUsed)} free</p>
          </div>
        </Section>

        {/* ── Danger zone ── */}
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-red-100 bg-red-50/50">
            <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
            <p className="text-sm text-red-400 mt-0.5">These actions are irreversible.</p>
          </div>
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-dark">Log out of all sessions</p>
              <p className="text-xs text-slate-mid mt-0.5">Revokes your current JWT and returns to login.</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm border border-red-300 text-red-500 rounded-xl
                         hover:bg-red-500 hover:text-white transition font-medium"
            >
              Log out
            </button>
          </div>
        </div>

      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </DashboardLayout>
  );
}

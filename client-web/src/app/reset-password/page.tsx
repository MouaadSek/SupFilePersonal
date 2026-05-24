'use client';

import { Suspense, useState, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/AuthLayout';
import PasswordInput from '@/components/PasswordInput';
import { apiResetPassword } from '@/lib/api';
import { getPasswordStrength } from '@/lib/passwordStrength';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!token) {
      setError('Missing reset token. Use the link from your email or request a new one.');
    }
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!token) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Reset failed. The link may have expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const strength = getPasswordStrength(password);

  if (done) {
    return (
      <div className="auth-card">
        <div className="flex flex-col items-center mb-8">
          <Image src="/supfile.png" alt="SUPFile" width={56} height={56} className="rounded-2xl shadow-md mb-3" priority />
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Password updated</h1>
          <p className="text-sm text-slate-mid dark:text-slate-400 mt-1 text-center">
            You can now sign in with your new password.
          </p>
        </div>
        <Link href="/login" className="btn-primary w-full text-center block">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="flex flex-col items-center mb-8">
        <Image src="/supfile.png" alt="SUPFile" width={56} height={56} className="rounded-2xl shadow-md mb-3" priority />
        <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Set new password</h1>
        <p className="text-sm text-slate-mid dark:text-slate-400 mt-1 text-center">
          Choose a strong password for your account
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
            New password
          </label>
          <PasswordInput
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      n <= strength.score ? strength.color : 'bg-slate-light dark:bg-slate-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-mid dark:text-slate-400">{strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
            Confirm password
          </label>
          <PasswordInput
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className={
              confirm && confirm !== password ? 'border-red-400 focus:ring-red-400' : ''
            }
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading || !token}>
          {loading ? 'Updating…' : 'Set new password'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-mid mt-6">
        <Link href="/forgot-password" className="text-brand font-medium hover:text-brand-light transition">
          Request a new link
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense
        fallback={
          <div className="auth-card text-center text-slate-mid py-8">Loading…</div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}

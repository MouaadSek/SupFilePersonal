'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRegister, apiMe } from '@/lib/api';
import { saveToken, getToken } from '@/lib/auth';
import AuthLayout from '@/components/AuthLayout';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if already logged in with a valid session
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiMe().then(() => router.replace('/dashboard')).catch(() => {/* token invalid — stay on register */});
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

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
      const { token } = await apiRegister(email, password, displayName);
      saveToken(token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const strength = getPasswordStrength(password);

  return (
    <AuthLayout>
      <div className="auth-card">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/supfile.png" alt="SUPFile" width={56} height={56} className="rounded-2xl shadow-md mb-3" priority />
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Create your account</h1>
          <p className="text-sm text-slate-mid dark:text-slate-400 mt-1">30 GB free — no credit card required</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {/* Strength bar */}
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
            <input
              type="password"
              className={`input-field ${
                confirm && confirm !== password ? 'border-red-400 focus:ring-red-400' : ''
              }`}
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Creating account…
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-mid dark:text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand font-medium hover:text-brand-light transition">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-brand'];
  return { score, label: labels[score], color: colors[Math.max(0, score - 1)] };
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}


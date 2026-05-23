'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRegister, apiMe } from '@/lib/api';
import { saveToken, getToken } from '@/lib/auth';
import AuthLayout from '@/components/AuthLayout';
import { getPublicApiBase } from '@/lib/apiBase';

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

        {/* OAuth divider */}
        <div className="flex items-center gap-3 my-6">
          <hr className="flex-1 border-slate-light dark:border-slate-700" />
          <span className="text-xs text-slate-mid dark:text-slate-400">or sign up with</span>
          <hr className="flex-1 border-slate-light dark:border-slate-700" />
        </div>

        <a
          href={`${getPublicApiBase()}/auth/oauth/github`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-slate-light dark:border-slate-600
                     text-slate-dark dark:text-slate-100 text-sm font-medium
                     hover:bg-brand-bg dark:hover:bg-slate-700 transition-colors duration-200"
        >
          <GithubIcon />
          Continue with GitHub
        </a>

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

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483
               0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466
               -.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832
               .092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688
               -.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337
               c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688
               0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747
               0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

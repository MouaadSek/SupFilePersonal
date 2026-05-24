'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiLogin, apiMe } from '@/lib/api';
import { saveToken, getToken } from '@/lib/auth';
import AuthLayout from '@/components/AuthLayout';
import { getPublicApiBase } from '@/lib/apiBase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if already logged in with a valid session
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiMe().then(() => router.replace('/dashboard')).catch(() => {/* token invalid — stay on login */});
  }, [router]);

  // Handle OAuth redirect: /login?token=... or /login?error=oauth_failed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      saveToken(decodeURIComponent(token));
      router.replace('/dashboard');
      return;
    }
    const oauthError = params.get('error');
    if (oauthError) {
      setError('Google sign-in failed. Please try again.');
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await apiLogin(email, password);
      saveToken(token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/supfile.png" alt="SUPFile" width={56} height={56} className="rounded-2xl shadow-md mb-3" priority />
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Welcome back</h1>
          <p className="text-sm text-slate-mid dark:text-slate-400 mt-1">Sign in to your SUPFile account</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100">Password</label>
              <Link href="/forgot-password" className="text-xs text-brand hover:text-brand-light transition">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* OAuth buttons */}
        <div className="flex items-center gap-3 my-6">
          <hr className="flex-1 border-slate-light dark:border-slate-700" />
          <span className="text-xs text-slate-mid dark:text-slate-400">or continue with</span>
          <hr className="flex-1 border-slate-light dark:border-slate-700" />
        </div>

        <div className="space-y-3">
          {/* Google */}
          <button
            type="button"
            onClick={() => { window.location.href = `${getPublicApiBase()}/auth/oauth/google`; }}
            className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-slate-light dark:border-slate-600
                       bg-white dark:bg-slate-700 text-slate-dark dark:text-slate-100 text-sm font-medium
                       hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-gray-300 dark:hover:border-slate-500
                       transition-colors duration-200 shadow-sm"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-sm text-slate-mid dark:text-slate-400 mt-6">
          No account?{' '}
          <Link href="/register" className="text-brand font-medium hover:text-brand-light transition">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}


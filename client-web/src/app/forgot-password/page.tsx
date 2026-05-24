'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import { apiForgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiForgotPassword(email);
      setMessage(data.message || 'Check your email for reset instructions.');
      setSent(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Request failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="flex flex-col items-center mb-8">
          <Image src="/supfile.png" alt="SUPFile" width={56} height={56} className="rounded-2xl shadow-md mb-3" priority />
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Forgot password</h1>
          <p className="text-sm text-slate-mid dark:text-slate-400 mt-1 text-center">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {sent ? (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-400 text-sm">
              {message}
            </div>
            <p className="text-sm text-slate-mid dark:text-slate-400 text-center">
              Check your inbox and spam folder. The link expires in one hour.
            </p>
            <Link href="/login" className="btn-primary w-full text-center block">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark dark:text-slate-100 mb-1.5">
                Email
              </label>
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
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-mid mt-6">
          <Link href="/login" className="text-brand font-medium hover:text-brand-light transition">
            Back to login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

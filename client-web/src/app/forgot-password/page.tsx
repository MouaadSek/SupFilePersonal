'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import { getApiBase } from '@/lib/apiBase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessage(data.message || 'Check your email for reset instructions.');
      if (data.dev_reset_token) {
        setDevToken(data.dev_reset_token);
        setToken(data.dev_reset_token);
        setStep('reset');
      } else {
        setStep('reset');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setStep('done');
      setMessage(data.message || 'Password updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="flex flex-col items-center mb-8">
          <Image src="/supfile.png" alt="SUPFile" width={56} height={56} className="rounded-2xl shadow-md mb-3" priority />
          <h1 className="text-2xl font-bold text-slate-dark dark:text-slate-100">Reset password</h1>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}
        {message && step !== 'request' && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
            {message}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            {devToken && (
              <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                Development mode: reset token pre-filled from server.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">Reset token</label>
              <input
                className="input-field font-mono text-sm"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">New password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Updating…' : 'Set new password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <Link href="/login" className="btn-primary w-full text-center block">
            Back to sign in
          </Link>
        )}

        <p className="text-center text-sm text-slate-mid mt-6">
          <Link href="/login" className="text-brand font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

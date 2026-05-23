import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="blob-drift fixed top-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2da2fd 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }}
      />
      <div
        aria-hidden
        className="blob-drift2 fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3cb5ff 0%, transparent 70%)', transform: 'translate(30%, 30%)' }}
      />

      <div className="page-enter relative z-10 w-full max-w-md">
        {children}

        {/* Footer note */}
        <p className="text-center text-xs text-slate-mid mt-6">
          SUPFile &copy; {new Date().getFullYear()} — Secure cloud storage
        </p>
      </div>
    </div>
  );
}

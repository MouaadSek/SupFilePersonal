import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2da2fd 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }}
      />
      <div
        aria-hidden
        className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3cb5ff 0%, transparent 70%)', transform: 'translate(30%, 30%)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {children}

        {/* Footer note */}
        <p className="text-center text-xs text-slate-mid mt-6">
=======
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #c2d8f2 0%, #d4e9fb 40%, #b8deff 75%, #cce8ff 100%)' }}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="blob-drift fixed top-0 left-0 w-[700px] h-[700px] rounded-full opacity-50 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2da2fd 0%, transparent 65%)', transform: 'translate(-30%, -30%)' }}
      />
      <div
        aria-hidden
        className="blob-drift2 fixed bottom-0 right-0 w-[600px] h-[600px] rounded-full opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6cb6ff 0%, transparent 65%)', transform: 'translate(30%, 30%)' }}
      />
      <div
        aria-hidden
        className="blob-drift fixed top-1/2 right-1/4 w-[400px] h-[400px] rounded-full opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #93c5fd 0%, transparent 65%)', transform: 'translate(50%, -50%)' }}
      />

      <div className="page-enter relative z-10 w-full max-w-md">
        {children}

        {/* Footer note */}
        <p className="text-center text-xs text-slate-mid dark:text-slate-400 mt-6">
>>>>>>> origin/mouaad
          SUPFile &copy; {new Date().getFullYear()} — Secure cloud storage
        </p>
      </div>
    </div>
  );
}

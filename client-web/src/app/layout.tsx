import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SUPFile — Cloud Storage',
  description: 'Secure cloud file storage and sharing platform.',
};

// Runs synchronously before React hydration — prevents theme flash
const themeScript = `
  try {
    if (localStorage.getItem('supfile_theme') === 'dark')
      document.documentElement.classList.add('dark');
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-brand-bg dark:bg-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

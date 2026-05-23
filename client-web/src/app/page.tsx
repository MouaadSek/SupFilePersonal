import Image from "next/image";
import Link from "next/link";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { IconCloud, IconFile, IconShare } from "@/components/icons";

const features = [
  {
    Icon: IconCloud,
    title: "Cloud Storage",
    description:
      "Upload and store all your files securely in the cloud. Access them from any device, anywhere in the world.",
  },
  {
    Icon: IconShare,
    title: "Easy Sharing",
    description:
      "Share files and folders with colleagues and friends using secure, expiring links — no account required.",
  },
  {
    Icon: IconFile,
    title: "Organize Everything",
    description:
      "Keep your files tidy with folders, smart search, and a clean dashboard built for real productivity.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Fixed navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-light/50 dark:border-slate-700/50">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/supfile.png" alt="SupFile" width={28} height={28} priority />
          <span className="font-bold text-base tracking-tight text-slate-dark dark:text-white group-hover:text-brand transition-colors">
            SupFile
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-dark dark:text-slate-300 hover:text-brand dark:hover:text-brand rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand-light rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <BackgroundPaths title="Secure Simple Shared" />

      {/* Features section */}
      <section className="py-24 px-6 bg-white dark:bg-slate-800">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-dark dark:text-white mb-4 tracking-tight">
            Everything you need in one place
          </h2>
          <p className="text-center text-slate-mid dark:text-slate-400 mb-16 max-w-lg mx-auto leading-relaxed">
            SupFile brings all your cloud storage needs together with a clean,
            intuitive experience.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map(({ Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center p-8 rounded-2xl bg-brand-bg dark:bg-slate-900 border border-slate-light/60 dark:border-slate-700/60 hover:border-brand/40 dark:hover:border-brand/40 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center mb-5 text-brand group-hover:bg-brand/20 transition-colors">
                  <Icon />
                </div>
                <h3 className="text-lg font-semibold text-slate-dark dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-sm text-slate-mid dark:text-slate-400 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 px-6 bg-brand-bg dark:bg-slate-900">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-dark dark:text-white mb-4 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-slate-mid dark:text-slate-400 mb-8 leading-relaxed">
            Join thousands of users who trust SupFile with their important
            files.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 text-base font-semibold text-white bg-brand hover:bg-brand-light rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              Create Free Account →
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 text-base font-semibold text-slate-dark dark:text-white bg-white dark:bg-slate-800 hover:bg-white/80 rounded-xl border border-slate-light dark:border-slate-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-white dark:bg-slate-900 border-t border-slate-light/50 dark:border-slate-700/50">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/supfile.png" alt="SupFile" width={20} height={20} />
            <span className="text-sm font-semibold text-slate-dark dark:text-white">
              SupFile
            </span>
          </div>
          <p className="text-xs text-slate-mid dark:text-slate-500">
            © {new Date().getFullYear()} SupFile. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/login"
              className="text-xs text-slate-mid hover:text-brand dark:hover:text-brand transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs text-slate-mid hover:text-brand dark:hover:text-brand transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

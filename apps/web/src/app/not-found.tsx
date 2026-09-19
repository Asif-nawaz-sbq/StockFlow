import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-bg-subtle text-fg-subtle">
          <FileQuestion className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-2xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          Error 404
        </p>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-fg">Page not found</h1>
        <p className="mt-1.5 max-w-sm text-sm text-fg-muted">
          This record does not exist, or it belongs to a different workspace.
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-hover"
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

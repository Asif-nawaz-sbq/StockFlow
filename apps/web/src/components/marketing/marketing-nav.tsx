'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Boxes, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#demo', label: 'Live demo' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg">
            <Boxes className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-fg">StockFlow</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-medium text-accent-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover"
          >
            Create workspace
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-hover hover:text-fg md:hidden"
        >
          {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm text-fg-muted hover:bg-surface-hover hover:text-fg"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              <Link
                href="/login"
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-fg"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-accent text-sm font-medium text-accent-fg"
              >
                Create workspace
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

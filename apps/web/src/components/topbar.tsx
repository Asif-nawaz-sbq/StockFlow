'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { apiFetch } from '@/lib/client';
import { Brand, SidebarNav } from './sidebar';
import { ROUTE_TITLES } from './nav-config';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  ops_manager: 'Operations',
  warehouse_clerk: 'Warehouse',
  viewer: 'Read only',
};

function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Topbar({
  fullName,
  email,
  roles,
  permissions,
  tenantName,
}: {
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  tenantName: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title = ROUTE_TITLES.find((r) => pathname.startsWith(r.prefix))?.title ?? 'StockFlow';

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setDrawerOpen(false), [pathname]);

  async function signOut() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="-ml-1 grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-hover hover:text-fg lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4.5 w-4.5" aria-hidden />
          </button>
          <h1 className="truncate text-sm font-semibold text-fg">{title}</h1>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-hover"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-subtle text-[11px] font-semibold text-accent">
              {initials(fullName)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-[13px] font-medium leading-tight text-fg">
                {fullName}
              </span>
              <span className="block text-2xs leading-tight text-fg-subtle">
                {roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}
              </span>
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-1.5 w-64 animate-fade-in overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-lg)]"
            >
              <div className="border-b border-border px-3.5 py-3">
                <p className="truncate text-[13px] font-medium text-fg">{fullName}</p>
                <p className="truncate text-xs text-fg-muted">{email}</p>
                <p className="mt-1.5 truncate text-2xs text-fg-subtle">{tenantName}</p>
              </div>

              <div className="border-b border-border px-3.5 py-2.5">
                <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  {permissions.length} permissions
                </p>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 animate-slide-in flex-col bg-surface shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between border-b border-border pr-2">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-hover hover:text-fg"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <SidebarNav permissions={permissions} onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-border px-5 py-3">
              <p className="truncate text-[13px] font-medium text-fg">{tenantName}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

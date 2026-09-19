'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes } from 'lucide-react';
import { NAV_SECTIONS } from './nav-config';

function isActive(pathname: string, href: string): boolean {
  // /dashboard must not light up for /dashboard/products.
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
}

export function SidebarNav({
  permissions,
  onNavigate,
}: {
  permissions: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const held = new Set(permissions);

  // Hiding a link the user cannot use is cosmetic. The guard on the API is what
  // actually enforces access.
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => held.has(item.permission)),
  })).filter((section) => section.items.length > 0);

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-2.5 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2
                                text-[13px] font-medium transition-colors ${
                                  active
                                    ? 'bg-accent-subtle text-accent'
                                    : 'text-fg-muted hover:bg-surface-hover hover:text-fg'
                                }`}
                  >
                    <item.icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted'}`}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-4">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg">
        <Boxes className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-fg">StockFlow</span>
    </Link>
  );
}

export function Sidebar({
  permissions,
  tenantName,
}: {
  permissions: string[];
  tenantName: string;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="border-b border-border">
        <Brand />
      </div>

      <SidebarNav permissions={permissions} />

      <div className="border-t border-border px-5 py-3">
        <p className="text-2xs font-medium uppercase tracking-[0.08em] text-fg-subtle">Workspace</p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-fg">{tenantName}</p>
      </div>
    </aside>
  );
}

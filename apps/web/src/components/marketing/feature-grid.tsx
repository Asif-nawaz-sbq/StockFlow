import type { LucideIcon } from 'lucide-react';
import { History, Layers, LockKeyhole, RefreshCcw, ScrollText, TrendingDown } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: History,
    title: 'Append-only stock ledger',
    body: 'Every movement is a permanent journal entry with the balance stamped on it. Running totals are a cache that can always be rebuilt from the ledger.',
  },
  {
    icon: LockKeyhole,
    title: 'Allocation that cannot oversell',
    body: 'Confirming an order locks stock rows FOR UPDATE in a deterministic order. Ten concurrent orders for the last units: exactly one wins, and there is a test that proves it.',
  },
  {
    icon: RefreshCcw,
    title: 'Reserve now, ship later',
    body: 'Confirming reserves stock without moving on-hand. Only shipment posts the goods-out movement. Cancelling gives the units straight back.',
  },
  {
    icon: TrendingDown,
    title: 'Replenishment suggestions',
    body: 'Products below their reorder point, counting stock already inbound, with quantities rounded up to each supplier’s minimum order.',
  },
  {
    icon: Layers,
    title: 'Multi-tenant by construction',
    body: 'Tenant scope comes from the signed token, never from a request parameter. Four roles across 23 permissions, enforced per endpoint.',
  },
  {
    icon: ScrollText,
    title: 'Auditable by default',
    body: 'Every write records actor, action, entity and IP with sensitive fields redacted. Idempotency keys stop a double-click becoming a double shipment.',
  },
];

export function FeatureGrid() {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature) => (
        <div key={feature.title} className="bg-surface p-6">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-subtle text-accent">
            <feature.icon className="h-4.5 w-4.5" aria-hidden />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-fg">{feature.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{feature.body}</p>
        </div>
      ))}
    </div>
  );
}

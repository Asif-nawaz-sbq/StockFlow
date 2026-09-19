import { Badge } from './ui/badge';
import type { PurchaseOrderStatus, SalesOrderStatus } from '@/lib/types';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const SALES_ORDER: Record<SalesOrderStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  picked: { label: 'Picked', tone: 'warning' },
  shipped: { label: 'Shipped', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

const PURCHASE_ORDER: Record<PurchaseOrderStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Ordered', tone: 'info' },
  partially_received: { label: 'Part delivered', tone: 'warning' },
  received: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

const MOVEMENT: Record<string, { label: string; tone: Tone }> = {
  receipt: { label: 'Goods in', tone: 'success' },
  issue: { label: 'Goods out', tone: 'info' },
  adjustment: { label: 'Adjustment', tone: 'neutral' },
  return: { label: 'Return', tone: 'accent' },
  scrap: { label: 'Scrapped', tone: 'danger' },
  transfer_in: { label: 'Transfer in', tone: 'accent' },
  transfer_out: { label: 'Transfer out', tone: 'accent' },
};

export function SalesOrderBadge({ status }: { status: SalesOrderStatus }) {
  const meta = SALES_ORDER[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export function PurchaseOrderBadge({ status }: { status: PurchaseOrderStatus }) {
  const meta = PURCHASE_ORDER[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export function MovementBadge({ type }: { type: string }) {
  const meta = MOVEMENT[type] ?? { label: type, tone: 'neutral' as Tone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function StockBadge({
  available,
  reorderPoint,
}: {
  available: number;
  reorderPoint: number;
}) {
  if (available <= 0) {
    return (
      <Badge tone="danger" dot>
        Out of stock
      </Badge>
    );
  }
  if (reorderPoint > 0 && available < reorderPoint) {
    return (
      <Badge tone="warning" dot>
        Low
      </Badge>
    );
  }
  return (
    <Badge tone="success" dot>
      In stock
    </Badge>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, PackageCheck, Truck, XCircle } from 'lucide-react';
import { ClientApiError, apiFetch, withIdempotencyKey } from '@/lib/client';
import { Button } from './ui/button';
import type { SalesOrderStatus } from '@/lib/types';

interface Props {
  orderId: string;
  status: SalesOrderStatus;
  permissions: string[];
}

interface Shortfall {
  sku: string;
  requested: number;
  available: number;
}

export function OrderActions({ orderId, status, permissions }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{
    message: string;
    shortfalls: Shortfall[];
  } | null>(null);

  const held = new Set(permissions);

  async function run(action: string, path: string, body?: unknown) {
    setPending(action);
    setError(null);

    try {
      await apiFetch(
        path,
        withIdempotencyKey({
          method: 'POST',
          body: body ? JSON.stringify(body) : undefined,
        }),
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError({
          message: err.message,
          shortfalls:
            err.code === 'INSUFFICIENT_STOCK'
              ? ((err.details?.shortfalls as Shortfall[]) ?? [])
              : [],
        });
      } else {
        setError({
          message: 'Action failed. Is the API reachable?',
          shortfalls: [],
        });
      }
    } finally {
      setPending(null);
    }
  }

  const canConfirm = status === 'draft' && held.has('sales_orders:confirm');
  const canPick = status === 'confirmed' && held.has('sales_orders:fulfil');
  const canShip = status === 'picked' && held.has('sales_orders:fulfil');
  const canCancel =
    status !== 'shipped' && status !== 'cancelled' && held.has('sales_orders:write');

  const nothingToDo = !canConfirm && !canPick && !canShip && !canCancel;

  return (
    <div className="flex w-full max-w-md flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="flex flex-wrap justify-end gap-2">
        {canConfirm ? (
          <Button
            variant="primary"
            loading={pending === 'confirm'}
            disabled={pending !== null}
            onClick={() => run('confirm', `/sales-orders/${orderId}/confirm`)}
          >
            {pending === 'confirm' ? null : <CheckCircle2 className="h-4 w-4" aria-hidden />}
            Confirm and reserve
          </Button>
        ) : null}

        {canPick ? (
          <Button
            variant="primary"
            loading={pending === 'pick'}
            disabled={pending !== null}
            onClick={() => run('pick', `/sales-orders/${orderId}/pick`)}
          >
            {pending === 'pick' ? null : <PackageCheck className="h-4 w-4" aria-hidden />}
            Mark as picked
          </Button>
        ) : null}

        {canShip ? (
          <Button
            variant="primary"
            loading={pending === 'ship'}
            disabled={pending !== null}
            onClick={() => run('ship', `/sales-orders/${orderId}/ship`)}
          >
            {pending === 'ship' ? null : <Truck className="h-4 w-4" aria-hidden />}
            Post shipment
          </Button>
        ) : null}

        {canCancel ? (
          <Button
            variant="danger"
            loading={pending === 'cancel'}
            disabled={pending !== null}
            onClick={() =>
              run('cancel', `/sales-orders/${orderId}/cancel`, {
                reason: 'Cancelled manually in the back office',
              })
            }
          >
            {pending === 'cancel' ? null : <XCircle className="h-4 w-4" aria-hidden />}
            Cancel order
          </Button>
        ) : null}
      </div>

      {nothingToDo ? (
        <p className="text-right text-xs text-fg-subtle">
          {status === 'shipped' || status === 'cancelled'
            ? 'Order closed'
            : 'Your role has no action available in this status'}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="animate-fade-in rounded-xl border border-danger-border bg-danger-subtle px-3.5 py-3 text-left"
        >
          <p className="flex items-start gap-2 text-[13px] font-medium text-danger">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {error.message}
          </p>
          {error.shortfalls.length > 0 ? (
            <ul className="mt-2 space-y-1 pl-6">
              {error.shortfalls.map((s) => (
                <li key={s.sku} className="font-mono text-2xs text-danger">
                  {s.sku}: {s.requested} requested, only {s.available} available
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

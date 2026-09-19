import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, CircleDashed } from 'lucide-react';
import { ApiRequestError, serverFetch } from '@/lib/api';
import { formatDateTime, formatEur, formatNumber } from '@/lib/format';
import type { AuthUser, SalesOrder, SalesOrderStatus } from '@/lib/types';
import { SalesOrderBadge } from '@/components/badges';
import { OrderActions } from '@/components/order-actions';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Table, TBody, Td, THead, Th, Tr, TableWrap } from '@/components/ui/table';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const order = await serverFetch<SalesOrder>(`/sales-orders/${id}`);
    return { title: order.orderNumber };
  } catch {
    return { title: 'Order' };
  }
}

const STEPS: Array<{ status: SalesOrderStatus; label: string }> = [
  { status: 'draft', label: 'Draft' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'picked', label: 'Picked' },
  { status: 'shipped', label: 'Shipped' },
];

function Timeline({ status }: { status: SalesOrderStatus }) {
  if (status === 'cancelled') return null;
  const currentIndex = STEPS.findIndex((step) => step.status === status);

  return (
    <ol className="flex items-center gap-1">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li key={step.status} className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${
                done ? 'text-success' : current ? 'bg-accent-subtle text-accent' : 'text-fg-subtle'
              }`}
            >
              {done ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <CircleDashed className="h-3 w-3" aria-hidden />
              )}
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span
                className={`h-px w-5 ${index < currentIndex ? 'bg-success' : 'bg-border'}`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  let order: SalesOrder;
  try {
    order = await serverFetch<SalesOrder>(`/sales-orders/${id}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  }

  const user = await serverFetch<AuthUser>('/auth/me');
  const lines = order.lines ?? [];
  const totalUnits = lines.reduce((sum, line) => sum + line.qty, 0);
  const allocatedUnits = lines.reduce((sum, line) => sum + line.allocatedQty, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Sales orders
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-tight text-fg">
              {order.orderNumber}
            </h1>
            <SalesOrderBadge status={order.status} />
          </div>

          <p className="mt-1.5 text-sm text-fg-muted">
            {order.customer?.name} · shipping from {order.warehouse?.name}
          </p>

          <div className="mt-3">
            <Timeline status={order.status} />
          </div>
        </div>

        <OrderActions orderId={order.id} status={order.status} permissions={user.permissions} />
      </div>

      {order.status === 'cancelled' ? (
        <div className="rounded-xl border border-danger-border bg-danger-subtle px-4 py-3 text-[13px] text-danger">
          Cancelled on {formatDateTime(order.cancelledAt)}
          {order.cancellationReason ? ` — ${order.cancellationReason}` : ''}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-4">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <dl className="space-y-2.5 text-[13px]">
                <Row label="Placed" value={formatDateTime(order.placedAt)} />
                <Row label="Confirmed" value={formatDateTime(order.confirmedAt)} />
                <Row label="Shipped" value={formatDateTime(order.shippedAt)} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Customer" />
            <CardBody>
              <dl className="space-y-2.5 text-[13px]">
                <Row label="Number" value={order.customer?.code ?? '—'} mono />
                <Row label="City" value={order.customer?.billingCity ?? '—'} />
                <Row
                  label="Payment terms"
                  value={`${order.customer?.paymentTermsDays ?? 0} days`}
                />
                <Row
                  label="Credit limit"
                  value={
                    order.customer?.creditLimitCents
                      ? formatEur(order.customer.creditLimitCents)
                      : 'no limit'
                  }
                />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Reservation" />
            <CardBody>
              <p className="text-sm text-fg">
                <span className="text-2xl font-semibold tabular">
                  {formatNumber(allocatedUnits)}
                </span>
                <span className="ml-1.5 text-fg-muted">of {formatNumber(totalUnits)} units</span>
              </p>
              <p className="mt-1.5 text-xs text-fg-muted">
                {order.status === 'draft'
                  ? 'A draft does not commit any stock yet.'
                  : order.status === 'shipped'
                    ? 'The reservation became a goods-out movement on shipment.'
                    : order.status === 'cancelled'
                      ? 'The reservation was released when the order was cancelled.'
                      : 'Stock is held for this order.'}
              </p>
            </CardBody>
          </Card>
        </div>

        <Card className="overflow-hidden xl:col-span-3">
          <CardHeader
            title="Line items"
            description={lines.length === 1 ? '1 line' : `${lines.length} lines`}
          />

          <TableWrap>
            <Table>
              <THead>
                <Th>Product</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Reserved</Th>
                <Th align="right">Unit price</Th>
                <Th align="right">Discount</Th>
                <Th align="right">VAT</Th>
                <Th align="right">Net</Th>
              </THead>
              <TBody>
                {lines.map((line) => (
                  <Tr key={line.id}>
                    <Td>
                      <Link
                        href={`/dashboard/products/${line.productId}`}
                        className="font-mono text-2xs font-medium text-accent hover:underline"
                      >
                        {line.product?.sku}
                      </Link>
                      <span className="ml-2 block max-w-[20rem] truncate text-[13px] text-fg-muted">
                        {line.product?.name}
                      </span>
                    </Td>
                    <Td align="right" numeric>
                      {formatNumber(line.qty)}
                    </Td>
                    <Td align="right" numeric>
                      <span
                        className={
                          line.allocatedQty === 0
                            ? 'text-fg-subtle'
                            : line.allocatedQty < line.qty
                              ? 'text-warning'
                              : 'text-success'
                        }
                      >
                        {formatNumber(line.allocatedQty)}
                      </span>
                    </Td>
                    <Td align="right" numeric>
                      {formatEur(line.unitPriceCents)}
                    </Td>
                    <Td align="right" numeric muted>
                      {Number(line.discountPercent) > 0
                        ? `${Number(line.discountPercent).toFixed(0)}%`
                        : '—'}
                    </Td>
                    <Td align="right" numeric muted>
                      {Number(line.vatRate).toFixed(0)}%
                    </Td>
                    <Td align="right" numeric className="font-medium">
                      {formatEur(line.netCents)}
                    </Td>
                  </Tr>
                ))}
              </TBody>
              <tfoot className="border-t border-border bg-surface-sunken">
                <tr>
                  <td className="td text-fg-muted" colSpan={6}>
                    Subtotal, net
                  </td>
                  <td className="td text-right tabular">{formatEur(order.subtotalCents)}</td>
                </tr>
                <tr>
                  <td className="td text-fg-muted" colSpan={6}>
                    VAT
                  </td>
                  <td className="td text-right tabular">{formatEur(order.vatTotalCents)}</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="td font-semibold text-fg" colSpan={6}>
                    Total, gross
                  </td>
                  <td className="td text-right text-base font-semibold tabular text-fg">
                    {formatEur(order.grandTotalCents)}
                  </td>
                </tr>
              </tfoot>
            </Table>
          </TableWrap>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-2xs text-fg' : 'font-medium text-fg'}>{value}</dd>
    </div>
  );
}

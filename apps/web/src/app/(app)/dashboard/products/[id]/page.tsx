import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Activity, ArrowLeft, Boxes } from 'lucide-react';
import { ApiRequestError, serverFetch } from '@/lib/api';
import { formatDateTime, formatEur, formatNumber } from '@/lib/format';
import type { Product, StockLevel, StockMovement } from '@/lib/types';
import { MovementBadge, StockBadge } from '@/components/badges';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TBody, Td, THead, Th, Tr, TableWrap } from '@/components/ui/table';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const product = await serverFetch<Product>(`/products/${id}`);
    return { title: product.sku };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  let product: Product;
  try {
    product = await serverFetch<Product>(`/products/${id}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  }

  const [levels, movements] = await Promise.all([
    serverFetch<StockLevel[]>(`/inventory/products/${id}/levels`),
    serverFetch<StockMovement[]>(`/inventory/products/${id}/movements?limit=40`),
  ]);

  const totalOnHand = levels.reduce((sum, l) => sum + l.onHand, 0);
  const totalReserved = levels.reduce((sum, l) => sum + l.reserved, 0);
  const totalOnOrder = levels.reduce((sum, l) => sum + l.onOrder, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Products
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="rounded-md border border-border bg-bg-subtle px-2 py-1 font-mono text-xs text-fg-muted">
            {product.sku}
          </span>
          <StockBadge available={totalOnHand - totalReserved} reorderPoint={product.reorderPoint} />
          {!product.isActive ? (
            <span className="text-xs font-medium text-fg-subtle">archived</span>
          ) : null}
        </div>

        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-fg">{product.name}</h1>
        {product.description ? (
          <p className="mt-1.5 max-w-3xl text-sm text-fg-muted">{product.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="On hand" value={formatNumber(totalOnHand)} />
        <MiniStat label="Reserved" value={formatNumber(totalReserved)} />
        <MiniStat label="Available" value={formatNumber(totalOnHand - totalReserved)} emphasis />
        <MiniStat label="Inbound" value={formatNumber(totalOnOrder)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Master data" />
          <CardBody>
            <dl className="space-y-2.5 text-[13px]">
              <Row label="Category" value={product.category} />
              <Row label="Unit" value={product.unit} />
              <Row label="EAN" value={product.ean ?? '—'} mono />
              <Row label="Net price" value={formatEur(product.sellPriceCents)} />
              <Row label="VAT rate" value={`${Number(product.vatRate).toFixed(0)}%`} />
              <Row label="Reorder point" value={formatNumber(product.reorderPoint)} />
              <Row label="Reorder qty" value={formatNumber(product.reorderQuantity)} />
            </dl>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Stock by warehouse" />
          {levels.length === 0 ? (
            <EmptyState icon={Boxes} title="No stock recorded for this product" />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <Th>Warehouse</Th>
                  <Th align="right">On hand</Th>
                  <Th align="right">Reserved</Th>
                  <Th align="right">Available</Th>
                  <Th align="right">Inbound</Th>
                  <Th align="right">Last movement</Th>
                </THead>
                <TBody>
                  {levels.map((level) => (
                    <Tr key={level.id}>
                      <Td>
                        <span className="font-mono text-2xs text-fg-subtle">
                          {level.warehouse?.code}
                        </span>
                        <span className="ml-2">{level.warehouse?.name}</span>
                      </Td>
                      <Td align="right" numeric>
                        {formatNumber(level.onHand)}
                      </Td>
                      <Td align="right" numeric muted>
                        {formatNumber(level.reserved)}
                      </Td>
                      <Td align="right" numeric className="font-medium">
                        {formatNumber(level.onHand - level.reserved)}
                      </Td>
                      <Td align="right" numeric muted>
                        {formatNumber(level.onOrder)}
                      </Td>
                      <Td align="right" muted>
                        <span className="text-2xs">{formatDateTime(level.lastMovementAt)}</span>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Movement history"
          description="Append-only journal. Entries are never edited or deleted."
        />

        {movements.length === 0 ? (
          <EmptyState icon={Activity} title="No movements" />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <Th>When</Th>
                <Th>Type</Th>
                <Th>Warehouse</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Balance after</Th>
                <Th>Reference</Th>
                <Th>Note</Th>
              </THead>
              <TBody>
                {movements.map((movement) => (
                  <Tr key={movement.id}>
                    <Td muted>{formatDateTime(movement.occurredAt)}</Td>
                    <Td>
                      <MovementBadge type={movement.type} />
                    </Td>
                    <Td>
                      <span className="font-mono text-2xs text-fg-subtle">
                        {movement.warehouse?.code}
                      </span>
                    </Td>
                    <Td align="right" numeric>
                      <span
                        className={`font-medium ${movement.qtyDelta < 0 ? 'text-danger' : 'text-success'}`}
                      >
                        {movement.qtyDelta > 0 ? '+' : ''}
                        {formatNumber(movement.qtyDelta)}
                      </span>
                    </Td>
                    <Td align="right" numeric muted>
                      {formatNumber(movement.balanceAfter)}
                    </Td>
                    <Td muted>
                      <span className="text-2xs">{movement.referenceType ?? '—'}</span>
                    </Td>
                    <Td muted className="max-w-[16rem] truncate">
                      {movement.note ?? '—'}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="surface px-4 py-3">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular ${emphasis ? 'text-accent' : 'text-fg'}`}>
        {value}
      </p>
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

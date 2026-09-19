import Link from 'next/link';
import {
  ArrowRight,
  Activity,
  AlertTriangle,
  Euro,
  PackageSearch,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { serverFetch } from '@/lib/api';
import {
  formatDateTime,
  formatDayMonth,
  formatEur,
  formatEurCompact,
  formatNumber,
  formatRelative,
} from '@/lib/format';
import type { DashboardSummary, RecentMovement } from '@/lib/types';
import { MovementBadge } from '@/components/badges';
import { AreaChart, BarList } from '@/components/ui/chart';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, Td, THead, Th, Tr, TableWrap } from '@/components/ui/table';

export const metadata = { title: 'Dashboard' };

/** Second half of the window against the first, so the tile has something to compare to. */
function weekOverWeek(points: Array<{ netCents: number }>): number | null {
  if (points.length < 4) return null;
  const half = Math.floor(points.length / 2);
  const previous = points.slice(0, half).reduce((sum, p) => sum + p.netCents, 0);
  const current = points.slice(half).reduce((sum, p) => sum + p.netCents, 0);
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export default async function DashboardPage() {
  const [summary, movements] = await Promise.all([
    serverFetch<DashboardSummary>('/dashboard/summary'),
    serverFetch<RecentMovement[]>('/dashboard/recent-movements?limit=10'),
  ]);

  const trendTotal = summary.revenueTrend.reduce((sum, p) => sum + p.netCents, 0);
  const delta = weekOverWeek(summary.revenueTrend);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`As of ${formatDateTime(summary.generatedAt)} · figures cached for 60 seconds`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stock value"
          value={formatEur(summary.stockValueCents)}
          hint={`${formatNumber(summary.distinctSkusInStock)} products holding stock`}
          icon={Euro}
        />
        <StatCard
          label="Below reorder point"
          value={formatNumber(summary.lowStockCount)}
          hint="Product / warehouse pairs"
          icon={AlertTriangle}
          tone={summary.lowStockCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Open orders"
          value={formatNumber(summary.openOrderCount)}
          hint={formatEur(summary.openOrderValueCents)}
          icon={ShoppingCart}
        />
        <StatCard
          label="Shipped this month"
          value={formatNumber(summary.shippedThisMonthCount)}
          hint={formatEur(summary.shippedThisMonthValueCents)}
          icon={Truck}
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Net revenue"
            description="Shipped orders, last 14 days"
            action={
              <div className="text-right">
                <p className="text-lg font-semibold tabular text-fg">{formatEur(trendTotal)}</p>
                {delta !== null ? (
                  <p
                    className={`text-xs font-medium tabular ${delta >= 0 ? 'text-success' : 'text-danger'}`}
                  >
                    {delta >= 0 ? '+' : ''}
                    {delta.toFixed(0)}% vs previous week
                  </p>
                ) : null}
              </div>
            }
          />
          <CardBody className="pb-2 pl-2 pr-3">
            <AreaChart
              points={summary.revenueTrend}
              formatValue={formatEurCompact}
              formatLabel={formatDayMonth}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top products" description="By net revenue, last 90 days" />
          <CardBody>
            {summary.topProducts.length === 0 ? (
              <EmptyState icon={PackageSearch} title="No shipping history yet" />
            ) : (
              <BarList
                items={summary.topProducts.map((product) => ({
                  key: product.sku,
                  label: product.name,
                  sublabel: `${formatNumber(product.unitsShipped)} units`,
                  value: product.netCents,
                  display: formatEurCompact(product.netCents),
                }))}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent stock movements"
          description="Running journal across every product"
          action={
            <Link
              href="/dashboard/replenishment"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover"
            >
              Replenishment
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />

        {movements.length === 0 ? (
          <EmptyState icon={Activity} title="No movements recorded" />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <Th>When</Th>
                <Th>Type</Th>
                <Th>Product</Th>
                <Th>Warehouse</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Balance after</Th>
              </THead>
              <TBody>
                {movements.map((movement) => (
                  <Tr key={movement.id}>
                    <Td muted>{formatRelative(movement.occurredAt)}</Td>
                    <Td>
                      <MovementBadge type={movement.type} />
                    </Td>
                    <Td>
                      <span className="font-mono text-2xs text-fg-subtle">{movement.sku}</span>
                      <span className="ml-2">{movement.productName}</span>
                    </Td>
                    <Td>
                      <span className="font-mono text-2xs text-fg-subtle">
                        {movement.warehouseCode}
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

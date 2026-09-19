import Link from 'next/link';
import { CheckCircle2, Euro, PackageSearch, TrendingDown } from 'lucide-react';
import { serverFetch } from '@/lib/api';
import { formatEur, formatNumber } from '@/lib/format';
import type { ReplenishmentSuggestion } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, Td, THead, Th, Tr, TableWrap } from '@/components/ui/table';

export const metadata = { title: 'Replenishment' };

export default async function ReplenishmentPage() {
  const suggestions = await serverFetch<ReplenishmentSuggestion[]>('/replenishment/suggestions');

  const totalCost = suggestions.reduce((sum, s) => sum + (s.estimatedCostCents ?? 0), 0);
  const critical = suggestions.filter((s) => s.available <= 0).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Replenishment"
        description="Products whose available stock plus inbound purchase orders has fallen below the reorder point"
      />

      {suggestions.length === 0 ? (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title="Nothing to reorder"
            hint="Every product sits above its reorder point."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Suggestions"
              value={formatNumber(suggestions.length)}
              hint="Product / warehouse pairs"
              icon={TrendingDown}
              tone="warning"
            />
            <StatCard
              label="Out of stock"
              value={formatNumber(critical)}
              hint="Cannot ship right now"
              icon={PackageSearch}
              tone={critical > 0 ? 'warning' : 'success'}
            />
            <StatCard
              label="Purchase value"
              value={formatEur(totalCost)}
              hint="Estimated at supplier cost"
              icon={Euro}
            />
          </div>

          <Card className="overflow-hidden">
            <TableWrap>
              <Table>
                <THead>
                  <Th>Product</Th>
                  <Th>Warehouse</Th>
                  <Th align="right">Available</Th>
                  <Th align="right">Inbound</Th>
                  <Th className="w-32">Coverage</Th>
                  <Th align="right">Reorder pt.</Th>
                  <Th align="right">Suggested</Th>
                  <Th align="right">Cost</Th>
                  <Th>Supplier</Th>
                </THead>
                <TBody>
                  {suggestions.map((s) => (
                    <Tr key={`${s.productId}-${s.warehouseId}`}>
                      <Td>
                        <Link
                          href={`/dashboard/products/${s.productId}`}
                          className="font-mono text-2xs font-medium text-accent hover:underline"
                        >
                          {s.sku}
                        </Link>
                        <span className="ml-2 block max-w-[15rem] truncate text-[13px] text-fg-muted">
                          {s.name}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-2xs text-fg-subtle">{s.warehouseCode}</span>
                      </Td>
                      <Td align="right" numeric>
                        <span className={s.available <= 0 ? 'font-medium text-danger' : ''}>
                          {formatNumber(s.available)}
                        </span>
                      </Td>
                      <Td align="right" numeric muted>
                        {formatNumber(s.onOrder)}
                      </Td>
                      <Td>
                        <Progress
                          value={Math.max(0, s.projected)}
                          max={s.reorderPoint}
                          tone={s.projected <= 0 ? 'warning' : 'accent'}
                        />
                      </Td>
                      <Td align="right" numeric muted>
                        {formatNumber(s.reorderPoint)}
                      </Td>
                      <Td align="right" numeric className="font-medium">
                        {formatNumber(s.suggestedQty)}
                      </Td>
                      <Td align="right" numeric>
                        {s.estimatedCostCents === null ? '—' : formatEur(s.estimatedCostCents)}
                      </Td>
                      <Td>
                        <span className="block max-w-[13rem] truncate text-[13px]">
                          {s.preferredSupplierName ?? (
                            <span className="text-fg-subtle">no supplier on file</span>
                          )}
                        </span>
                        {s.leadTimeDays !== null ? (
                          <span className="text-2xs text-fg-subtle">
                            Lead time {s.leadTimeDays} days
                          </span>
                        ) : null}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </Card>
        </>
      )}
    </div>
  );
}

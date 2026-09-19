import { ClipboardList } from 'lucide-react';
import { serverFetch } from '@/lib/api';
import { formatDate, formatEur, formatNumber } from '@/lib/format';
import type { Page, PurchaseOrder } from '@/lib/types';
import { PurchaseOrderBadge } from '@/components/badges';
import { FilterChips } from '@/components/filter-chips';
import { Pagination } from '@/components/pagination';
import { SearchField } from '@/components/search-field';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, Td, THead, Th, Tr, TableWrap } from '@/components/ui/table';

export const metadata = { title: 'Purchase orders' };

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Ordered' },
  { value: 'partially_received', label: 'Part delivered' },
  { value: 'received', label: 'Delivered' },
];

interface Props {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function PurchaseOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams({
    page: params.page ?? '1',
    pageSize: '25',
  });
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);

  const orders = await serverFetch<Page<PurchaseOrder>>(`/dashboard/purchase-orders?${query}`);

  const chips = STATUSES.map((status) => ({
    value: status.value,
    label: status.label,
    href: status.value
      ? `/dashboard/purchase-orders?status=${status.value}`
      : '/dashboard/purchase-orders',
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase orders"
        description={`${formatNumber(orders.meta.total)} supplier orders`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchField placeholder="PO number or supplier" />
        <FilterChips chips={chips} active={params.status ?? ''} />
      </div>

      <Card className="overflow-hidden">
        {orders.data.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No purchase orders found" />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <Th>Number</Th>
                  <Th>Supplier</Th>
                  <Th>Warehouse</Th>
                  <Th>Expected</Th>
                  <Th align="right">Lead time</Th>
                  <Th>Status</Th>
                  <Th align="right">Order value</Th>
                </THead>
                <TBody>
                  {orders.data.map((order) => (
                    <Tr key={order.id}>
                      <Td>
                        <span className="font-mono text-2xs font-medium text-fg">
                          {order.poNumber}
                        </span>
                      </Td>
                      <Td className="max-w-[20rem] truncate">{order.supplier?.name}</Td>
                      <Td>
                        <span className="font-mono text-2xs text-fg-subtle">
                          {order.warehouse?.code}
                        </span>
                      </Td>
                      <Td muted>{formatDate(order.expectedAt)}</Td>
                      <Td align="right" numeric muted>
                        {order.supplier?.leadTimeDays ?? '—'} d
                      </Td>
                      <Td>
                        <PurchaseOrderBadge status={order.status} />
                      </Td>
                      <Td align="right" numeric className="font-medium">
                        {formatEur(order.subtotalCents)}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <Pagination meta={orders.meta} />
          </>
        )}
      </Card>
    </div>
  );
}

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { serverFetch } from '@/lib/api';
import { formatDateTime, formatEur, formatNumber } from '@/lib/format';
import type { Page, SalesOrder } from '@/lib/types';
import { SalesOrderBadge } from '@/components/badges';
import { FilterChips } from '@/components/filter-chips';
import { Pagination } from '@/components/pagination';
import { SearchField } from '@/components/search-field';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, Td, THead, Th, Tr, TableWrap } from '@/components/ui/table';

export const metadata = { title: 'Sales orders' };

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'picked', label: 'Picked' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface Props {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams({
    page: params.page ?? '1',
    pageSize: '25',
  });
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);

  const orders = await serverFetch<Page<SalesOrder>>(`/sales-orders?${query}`);

  const chips = STATUSES.map((status) => ({
    value: status.value,
    label: status.label,
    href: status.value ? `/dashboard/orders?status=${status.value}` : '/dashboard/orders',
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales orders"
        description={`${formatNumber(orders.meta.total)} orders${params.status ? ' in the selected status' : ''}`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchField placeholder="Order number or customer" />
        <FilterChips chips={chips} active={params.status ?? ''} />
      </div>

      <Card className="overflow-hidden">
        {orders.data.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders found"
            hint="Clear the filter or try a different search term."
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <Th>Number</Th>
                  <Th>Customer</Th>
                  <Th>Warehouse</Th>
                  <Th>Placed</Th>
                  <Th>Status</Th>
                  <Th align="right">Net</Th>
                  <Th align="right">Gross</Th>
                </THead>
                <TBody>
                  {orders.data.map((order) => (
                    <Tr key={order.id}>
                      <Td>
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="font-mono text-2xs font-medium text-accent hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </Td>
                      <Td className="max-w-[20rem] truncate">{order.customer?.name}</Td>
                      <Td>
                        <span className="font-mono text-2xs text-fg-subtle">
                          {order.warehouse?.code}
                        </span>
                      </Td>
                      <Td muted>{formatDateTime(order.placedAt)}</Td>
                      <Td>
                        <SalesOrderBadge status={order.status} />
                      </Td>
                      <Td align="right" numeric muted>
                        {formatEur(order.subtotalCents)}
                      </Td>
                      <Td align="right" numeric className="font-medium">
                        {formatEur(order.grandTotalCents)}
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

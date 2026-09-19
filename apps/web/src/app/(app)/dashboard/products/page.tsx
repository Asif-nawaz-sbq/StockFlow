import Link from 'next/link';
import { PackageSearch } from 'lucide-react';
import { serverFetch } from '@/lib/api';
import { formatEur, formatNumber } from '@/lib/format';
import type { Page, Product } from '@/lib/types';
import { StockBadge } from '@/components/badges';
import { FilterChips } from '@/components/filter-chips';
import { Pagination } from '@/components/pagination';
import { SearchField } from '@/components/search-field';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TBody, Td, THead, Th, Tr, TableWrap } from '@/components/ui/table';

export const metadata = { title: 'Products' };

interface Props {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = new URLSearchParams({
    page: params.page ?? '1',
    pageSize: '25',
  });
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);

  const [products, categories] = await Promise.all([
    serverFetch<Page<Product>>(`/dashboard/products?${query}`),
    serverFetch<string[]>('/products/categories'),
  ]);

  const chips = [
    { value: '', label: 'All categories', href: '/dashboard/products' },
    ...categories.map((category) => ({
      value: category,
      label: category,
      href: `/dashboard/products?category=${encodeURIComponent(category)}`,
    })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description={`${formatNumber(products.meta.total)} products in the catalogue`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchField placeholder="SKU, name or EAN" />
        <FilterChips chips={chips} active={params.category ?? ''} />
      </div>

      <Card className="overflow-hidden">
        {products.data.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            hint="Try a different search term or category."
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <Th>SKU</Th>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th align="right">Net price</Th>
                  <Th align="right">VAT</Th>
                  <Th align="right">On hand</Th>
                  <Th align="right">Reserved</Th>
                  <Th align="right">Available</Th>
                  <Th>Status</Th>
                </THead>
                <TBody>
                  {products.data.map((product) => (
                    <Tr key={product.id}>
                      <Td>
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="font-mono text-2xs font-medium text-accent hover:underline"
                        >
                          {product.sku}
                        </Link>
                      </Td>
                      <Td className="max-w-[17rem] truncate">{product.name}</Td>
                      <Td muted>{product.category}</Td>
                      <Td align="right" numeric>
                        {formatEur(product.sellPriceCents)}
                      </Td>
                      <Td align="right" numeric muted>
                        {Number(product.vatRate).toFixed(0)} %
                      </Td>
                      <Td align="right" numeric>
                        {formatNumber(product.totalOnHand ?? 0)}
                      </Td>
                      <Td align="right" numeric muted>
                        {formatNumber(product.totalReserved ?? 0)}
                      </Td>
                      <Td align="right" numeric className="font-medium">
                        {formatNumber(product.totalAvailable ?? 0)}
                      </Td>
                      <Td>
                        <StockBadge
                          available={product.totalAvailable ?? 0}
                          reorderPoint={product.reorderPoint}
                        />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <Pagination meta={products.meta} />
          </>
        )}
      </Card>
    </div>
  );
}

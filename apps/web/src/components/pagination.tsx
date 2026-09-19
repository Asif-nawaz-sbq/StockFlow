'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import type { PageMeta } from '@/lib/types';

export function Pagination({ meta }: { meta: PageMeta }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (meta.total === 0) return null;

  const goTo = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', String(page));
    router.push(`${pathname}?${next}`);
  };

  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-[13px] text-fg-muted">
        <span className="font-medium tabular text-fg">
          {from}–{to}
        </span>{' '}
        of <span className="tabular">{meta.total}</span>
      </p>

      {meta.totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <span className="mr-1 text-[13px] tabular text-fg-subtle">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button size="sm" disabled={meta.page <= 1} onClick={() => goTo(meta.page - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Previous
          </Button>
          <Button
            size="sm"
            disabled={meta.page >= meta.totalPages}
            onClick={() => goTo(meta.page + 1)}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

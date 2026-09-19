'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, Search, X } from 'lucide-react';

export function SearchField({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('search') ?? '');
  const [isPending, startTransition] = useTransition();

  // Debounced so typing does not fire a server round trip per keystroke.
  useEffect(() => {
    const current = searchParams.get('search') ?? '';
    if (value === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set('search', value);
      else next.delete('search');
      next.delete('page');
      startTransition(() => router.replace(`${pathname}?${next}`));
    }, 300);

    return () => clearTimeout(timer);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative w-full max-w-xs">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle"
        aria-hidden
      />
      <input
        type="search"
        className="input pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={placeholder}
      />
      {isPending ? (
        <Loader2
          className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-fg-subtle"
          aria-hidden
        />
      ) : value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-fg-subtle hover:bg-surface-hover hover:text-fg"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

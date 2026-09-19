import Link from 'next/link';

export interface Chip {
  value: string;
  label: string;
  href: string;
}

export function FilterChips({ chips, active }: { chips: Chip[]; active: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const isActive = chip.value === active;
        return (
          <Link
            key={chip.value}
            href={chip.href}
            aria-current={isActive ? 'true' : undefined}
            className={`rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg'
            }`}
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}

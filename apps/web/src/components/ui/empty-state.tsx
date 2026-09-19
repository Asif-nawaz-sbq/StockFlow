import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-bg-subtle text-fg-subtle">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3.5 text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-[13px] text-fg-muted">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

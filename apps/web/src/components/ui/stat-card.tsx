import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'warning' | 'success';
  /** Percent change against the preceding period. Omit when there is nothing to compare. */
  delta?: number | null;
}

const ICON_TONES = {
  neutral: 'bg-bg-subtle text-fg-muted',
  warning: 'bg-warning-subtle text-warning',
  success: 'bg-success-subtle text-success',
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  delta = null,
}: StatCardProps) {
  const showDelta = delta !== null && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;
  const DeltaIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="surface p-4 transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-fg-muted">{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${ICON_TONES[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight tabular text-fg">{value}</p>

      <div className="mt-1.5 flex items-center gap-2">
        {showDelta ? (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium tabular ${
              positive ? 'text-success' : 'text-danger'
            }`}
          >
            <DeltaIcon className="h-3 w-3" aria-hidden />
            {Math.abs(delta as number).toFixed(0)}%
          </span>
        ) : null}
        {hint ? <p className="truncate text-xs text-fg-subtle">{hint}</p> : null}
      </div>
    </div>
  );
}

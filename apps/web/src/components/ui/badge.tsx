type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'border-border bg-bg-subtle text-fg-muted',
  accent: 'border-accent-border bg-accent-subtle text-accent',
  success: 'border-success-border bg-success-subtle text-success',
  warning: 'border-warning-border bg-warning-subtle text-warning',
  danger: 'border-danger-border bg-danger-subtle text-danger',
  info: 'border-info-border bg-info-subtle text-info',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5
                  text-xs font-medium ${TONES[tone]}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} aria-hidden /> : null}
      {children}
    </span>
  );
}

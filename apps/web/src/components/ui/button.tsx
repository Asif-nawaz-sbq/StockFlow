import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[var(--shadow-sm)] hover:bg-accent-hover active:translate-y-px',
  secondary:
    'border border-border bg-surface text-fg shadow-[var(--shadow-sm)] hover:bg-surface-hover hover:border-border-strong active:translate-y-px',
  ghost: 'text-fg-muted hover:bg-surface-hover hover:text-fg',
  danger:
    'border border-danger-border bg-danger-subtle text-danger hover:bg-danger hover:text-white active:translate-y-px',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-sm',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled,
    className = '',
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg
                  font-medium transition-all disabled:pointer-events-none disabled:opacity-50
                  ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

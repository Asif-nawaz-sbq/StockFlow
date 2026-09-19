import type { Config } from 'tailwindcss';

/** Colours resolve to CSS variables so dark mode is a token swap, not a variant sweep. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        'bg-subtle': token('bg-subtle'),
        surface: token('surface'),
        'surface-hover': token('surface-hover'),
        'surface-sunken': token('surface-sunken'),
        border: token('border'),
        'border-strong': token('border-strong'),
        fg: token('fg'),
        'fg-muted': token('fg-muted'),
        'fg-subtle': token('fg-subtle'),
        accent: token('accent'),
        'accent-hover': token('accent-hover'),
        'accent-fg': token('accent-fg'),
        'accent-subtle': token('accent-subtle'),
        'accent-border': token('accent-border'),
        success: token('success'),
        'success-subtle': token('success-subtle'),
        'success-border': token('success-border'),
        warning: token('warning'),
        'warning-subtle': token('warning-subtle'),
        'warning-border': token('warning-border'),
        danger: token('danger'),
        'danger-subtle': token('danger-subtle'),
        'danger-border': token('danger-border'),
        info: token('info'),
        'info-subtle': token('info-subtle'),
        'info-border': token('info-border'),
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-in': 'slide-in 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;

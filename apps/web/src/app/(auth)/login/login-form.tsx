'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { ClientApiError, apiFetch } from '@/lib/client';
import { Button } from '@/components/ui/button';

const DEMO_EMAIL = 'a.brenner@nordmann-handel.de';
const DEMO_PASSWORD = 'Sommer2026!';

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(withEmail: string, withPassword: string) {
    setPending(true);
    setError(null);

    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: withEmail, password: withPassword }),
      });

      // Full navigation rather than router.push: the server components have to
      // re-render with the freshly set cookie.
      window.location.href = searchParams.get('next') ?? '/dashboard';
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(
          err.code === 'RATE_LIMITED' ? 'Too many attempts. Please wait a moment.' : err.message,
        );
      } else {
        setError('Sign-in failed. Is the API reachable?');
      }
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void signIn(email, password);
      }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="input"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={reveal ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="input pr-10"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
          >
            {reveal ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex animate-fade-in items-start gap-2 rounded-lg border border-danger-border bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" loading={pending} className="w-full">
        Sign in
      </Button>

      <div className="relative py-1">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
        <span className="relative mx-auto block w-fit bg-bg px-2 text-2xs uppercase tracking-[0.08em] text-fg-subtle">
          or
        </span>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setEmail(DEMO_EMAIL);
          setPassword(DEMO_PASSWORD);
          void signIn(DEMO_EMAIL, DEMO_PASSWORD);
        }}
      >
        Use the demo account
      </Button>

      <p className="text-center text-2xs text-fg-subtle">
        Other demo roles are listed on the{' '}
        <Link href="/#demo" className="underline underline-offset-2 hover:text-fg-muted">
          home page
        </Link>
        .
      </p>
    </form>
  );
}

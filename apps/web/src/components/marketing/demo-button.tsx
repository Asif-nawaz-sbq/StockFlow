'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/client';

/** Credentials are already printed on the sign-in page; this just saves the typing. */
const DEMO_EMAIL = 'a.brenner@nordmann-handel.de';
const DEMO_PASSWORD = 'Sommer2026!';

export function DemoButton({
  className = '',
  label = 'Open the live demo',
}: {
  className?: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function enter() {
    setPending(true);
    setFailed(false);
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      });
      // Full navigation so the server components render with the new cookie.
      window.location.href = '/dashboard';
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={enter}
        disabled={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5
                   text-sm font-medium text-accent-fg shadow-[var(--shadow-md)] transition-all
                   hover:bg-accent-hover active:translate-y-px disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ArrowRight className="h-4 w-4" aria-hidden />
        )}
        {pending ? 'Signing in…' : label}
      </button>

      {failed ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          Could not reach the API. Is the backend running?
        </p>
      ) : null}
    </div>
  );
}

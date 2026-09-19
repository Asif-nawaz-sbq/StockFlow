'use client';

import { useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { ClientApiError, apiFetch } from '@/lib/client';
import { Button } from '@/components/ui/button';

interface Rule {
  label: string;
  test: (value: string) => boolean;
}

// Mirrors the class-validator rules on RegisterDto. The API is the authority;
// this only saves the user a round trip to find out.
const RULES: Rule[] = [
  { label: 'At least 10 characters', test: (v) => v.length >= 10 },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One digit', test: (v) => /[0-9]/.test(v) },
];

export function SignupForm() {
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const passwordOk = RULES.every((rule) => rule.test(password));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors([]);

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ companyName, fullName, email, password }),
      });
      // The API signs the new owner in and sets cookies, so go straight in.
      window.location.href = '/dashboard';
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.code === 'VALIDATION_FAILED') {
          setError('Please check the fields below.');
          setFieldErrors((err.details?.fields as string[]) ?? []);
        } else if (err.code === 'RATE_LIMITED') {
          setError('Too many sign-up attempts from this address. Try again later.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Sign-up failed. Is the API reachable?');
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="companyName">
          Company
        </label>
        <input
          id="companyName"
          required
          autoFocus
          className="input"
          placeholder="Northwind Provisions Ltd"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="fullName">
          Your name
        </label>
        <input
          id="fullName"
          required
          autoComplete="name"
          className="input"
          placeholder="Alex Rivera"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="email">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          className="input"
          placeholder="alex@northwind-provisions.com"
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
            required
            autoComplete="new-password"
            className="input pr-10"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby="password-rules"
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

        <ul id="password-rules" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-1.5 text-2xs ${met ? 'text-success' : 'text-fg-subtle'}`}
              >
                <Check className={`h-3 w-3 ${met ? 'opacity-100' : 'opacity-30'}`} aria-hidden />
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>

      {error ? (
        <div
          role="alert"
          className="animate-fade-in rounded-lg border border-danger-border bg-danger-subtle px-3 py-2.5"
        >
          <p className="flex items-start gap-2 text-[13px] text-danger">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
          {fieldErrors.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5 pl-6">
              {fieldErrors.map((message) => (
                <li key={message} className="text-2xs text-danger">
                  {message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        loading={pending}
        disabled={!passwordOk}
        className="w-full"
      >
        Create workspace
      </Button>
    </form>
  );
}

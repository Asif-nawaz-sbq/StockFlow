'use client';

import { ErrorView } from '@/components/ui/error-view';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <ErrorView error={error} reset={reset} />
    </main>
  );
}

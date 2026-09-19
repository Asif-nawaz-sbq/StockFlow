'use client';

import { ErrorView } from '@/components/ui/error-view';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      error={error}
      reset={reset}
      boxed
      title="This view could not be loaded"
      body="The API did not respond as expected. Details are in the server log."
    />
  );
}

'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './button';

/**
 * A missing JS chunk is the common failure here, not a broken page.
 *
 * It happens whenever the app is redeployed while a browser is still holding
 * HTML from the previous build: the old chunk URLs 404, React throws, and this
 * boundary catches it. `reset()` cannot fix that - only a fresh document can -
 * so those errors trigger one automatic reload, guarded by sessionStorage so a
 * genuinely broken build cannot put the tab in a refresh loop.
 */
const RELOAD_GUARD = 'stockflow:chunk-reload';

function isStaleBuildError(error: Error): boolean {
  const text = `${error.name} ${error.message}`;
  return (
    /ChunkLoadError/i.test(text) ||
    /Loading chunk [\w-]+ failed/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text) ||
    /error loading dynamically imported module/i.test(text)
  );
}

export function ErrorView({
  error,
  reset,
  title = 'Something went wrong',
  body = 'The request could not be completed. Details are in the server log.',
  boxed = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  body?: string;
  boxed?: boolean;
}) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!isStaleBuildError(error)) return;
    if (sessionStorage.getItem(RELOAD_GUARD)) return;

    sessionStorage.setItem(RELOAD_GUARD, '1');
    setReloading(true);
    window.location.reload();
  }, [error]);

  // Clear the guard once a render succeeds, so a later deploy can self-heal too.
  useEffect(() => {
    if (!isStaleBuildError(error)) sessionStorage.removeItem(RELOAD_GUARD);
  }, [error]);

  const content = (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-danger-subtle text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>

      <h2 className="mt-3.5 text-sm font-semibold text-fg">
        {reloading ? 'Updating to the latest version…' : title}
      </h2>
      <p className="mt-1 max-w-md text-[13px] text-fg-muted">
        {reloading ? 'A new version was deployed. Reloading.' : body}
      </p>

      {error.digest ? (
        <p className="mt-2 font-mono text-2xs text-fg-subtle">Reference {error.digest}</p>
      ) : null}

      {!reloading ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
        </div>
      ) : null}
    </div>
  );

  return boxed ? <div className="surface">{content}</div> : content;
}

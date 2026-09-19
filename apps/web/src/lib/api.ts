import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ApiError } from './types';

/**
 * Server-side API client.
 *
 * Server components talk to the API over the container network
 * (API_INTERNAL_URL) rather than going back out through the load balancer, so
 * an SSR render costs one hop instead of three. The browser's auth cookie is
 * forwarded by hand because fetch on the server has no cookie jar of its own.
 */
const internalBase = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.message);
    this.name = 'ApiRequestError';
  }
}

interface ServerFetchOptions extends RequestInit {
  /** Seconds. Omit for no caching, which is the right default for live data. */
  revalidate?: number;
}

export async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const { revalidate, ...init } = options;

  const response = await fetch(`${internalBase}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      cookie: cookieHeader,
      ...init.headers,
    },
    cache: revalidate === undefined ? 'no-store' : undefined,
    next: revalidate === undefined ? undefined : { revalidate },
  });

  if (response.status === 401) {
    // The access cookie expired mid-render. Bounce to login rather than
    // rendering a broken page full of empty tables.
    redirect('/login');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({
      code: 'UNKNOWN',
      message: response.statusText,
    }))) as ApiError;
    throw new ApiRequestError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

'use client';

import type { ApiError } from './types';

/**
 * Browser-side API client.
 *
 * Empty base means same-origin: in AWS the load balancer serves the frontend
 * and routes /api/* to the backend, so `/api/v1/...` resolves correctly with no
 * CORS and no absolute host. That matters because NEXT_PUBLIC_* is inlined at
 * build time and the load balancer's DNS name does not exist until after the
 * image has been built.
 *
 * Locally the two run on different ports, so compose sets this explicitly.
 */
const publicBase = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${publicBase}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ClientApiError(
      response.status,
      body?.code ?? 'UNKNOWN',
      body?.message ?? response.statusText,
      body?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Mutations that must not double-apply if the user double-clicks. */
export function withIdempotencyKey(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...init.headers,
      'Idempotency-Key': crypto.randomUUID(),
    },
  };
}

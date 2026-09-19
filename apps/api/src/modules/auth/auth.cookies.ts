import { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'sf_access';
export const REFRESH_COOKIE = 'sf_refresh';

function baseOptions(maxAgeSeconds: number): CookieOptions {
  return {
    httpOnly: true,
    // Lax rather than Strict: the frontend and API sit behind one ALB on the
    // same host, and Strict would drop the cookie on any external inbound link.
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: maxAgeSeconds * 1000,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessTtl: number,
  refreshTtl: number,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, baseOptions(accessTtl));
  // Scoped to the refresh route so it is not sent with every ordinary request.
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseOptions(refreshTtl),
    path: '/api/v1/auth',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(0), maxAge: undefined });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseOptions(0),
    maxAge: undefined,
    path: '/api/v1/auth',
  });
}

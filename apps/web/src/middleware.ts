import { NextRequest, NextResponse } from 'next/server';

/** Marketing and auth routes render for signed-out visitors. */
const PUBLIC_PATHS = ['/', '/login', '/signup'];

/**
 * Cheap gate so an unauthenticated visitor lands on /login instead of watching
 * every server component fetch bounce with a 401. Presence of the cookie is all
 * this checks - the API still validates the signature on every request, and
 * this never sees the signing secret.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (!request.cookies.has('sf_access')) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|screenshots|.*\\.svg).*)'],
};

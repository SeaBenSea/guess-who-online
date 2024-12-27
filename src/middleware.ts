import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const storedNickname = request.cookies.get('playerNickname')?.value;
  const host = request.headers.get('host') || '';
  const referer = request.headers.get('referer');

  // Protected routes that require a nickname
  if (pathname.startsWith('/room/') || pathname.startsWith('/game/')) {
    // First check if user has a nickname
    if (!storedNickname) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Then check if they came from our app
    if (!referer || !referer.includes(host)) {
      // For /game routes, also allow navigation from room pages
      if (pathname.startsWith('/game/') && referer?.includes(`${host}/room/`)) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Admin page protection (only for admin features, not the login page)
  if (pathname.startsWith('/admin/')) {
    const isAuth = request.cookies.get('adminPageAuth')?.value === 'true';
    if (!isAuth) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Characters page protection (only accessible from home)
  if (pathname === '/characters') {
    if (!referer || !referer.includes(host)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/room/:path*', '/game/:path*', '/admin/:path*', '/characters'],
};

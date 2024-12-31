import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/auth/signin', '/auth/signup', '/auth/verify-email'];
const PUBLIC_API_ROUTES = ['/api/auth/check-availability'];

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  const { pathname } = request.nextUrl;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // API route protection
  if (pathname.startsWith('/api/')) {
    // Allow public API routes
    if (PUBLIC_API_ROUTES.includes(pathname)) {
      return res;
    }

    // Check for authenticated session for protected API routes
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return res;
  }

  // Page route protection
  if (!session && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  if (session && pathname.includes('/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

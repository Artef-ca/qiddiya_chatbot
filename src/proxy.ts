import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/saml/login', '/api/auth/saml/callback'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CRITICAL: Always allow service worker and static assets first
  // Service workers must not be redirected or they will fail to register
  if (
    pathname === '/mockServiceWorker.js' ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|eot)$/i)
  ) {
    return NextResponse.next();
  }

  // Allow public routes and auth endpoints
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('session');
  
  // Check if coming from successful authentication (has auth=success param)
  const authSuccess = request.nextUrl.searchParams.get('auth') === 'success';
  
  // Check referrer to see if coming from auth callback
  const referer = request.headers.get('referer') || '';
  const fromAuthCallback = referer.includes('/api/auth/saml/callback');

  // If no session cookie, redirect to login (unless coming from auth callback)
  if (!sessionCookie && !authSuccess && !fromAuthCallback) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    // Preserve auth param if present
    if (authSuccess) {
      loginUrl.searchParams.set('auth', 'success');
    }
    return NextResponse.redirect(loginUrl);
  }
  
  // If we have auth=success but no cookie yet, allow through (cookie will be available on next request)
  // This handles the case where cookie is set in redirect response but not yet in request
  if (authSuccess && !sessionCookie) {
    return NextResponse.next();
  }

  // Verify session token if cookie exists
  if (sessionCookie) {
    try {
      const sessionData = await verifySession(sessionCookie.value);
      if (!sessionData) {
        // Invalid session, redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
      // Session is valid, allow through
    } catch (err) {
      console.error('Session verification error:', err);
      // On error, redirect to login for security
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - mockServiceWorker.js (MSW service worker) - MUST be excluded
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|mockServiceWorker\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|eot)$).*)',
  ],
};

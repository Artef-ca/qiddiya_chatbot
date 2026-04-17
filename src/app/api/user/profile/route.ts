import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

const SESSION_COOKIE_NAME = 'session';

export async function GET(request: NextRequest) {
  try {
    // Read session cookie directly from request (works better in API routes)
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    // Log all cookies for debugging (in development only)
    if (process.env.NODE_ENV === 'development') {
      const allCookies = request.cookies.getAll();
      console.log('User profile API - All cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));
    }

    if (!sessionToken) {
      console.log('User profile: No session token found in cookies');
      console.log('Available cookie names:', request.cookies.getAll().map(c => c.name));
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);

    if (!session) {
      console.log('User profile: Session token invalid or expired');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('User profile: Session found for user:', session);

    // Return user data from session
    return NextResponse.json({
      id: session.userId,
      name: session.name || session.firstName, // First name (for welcome screen)
      firstName: session.firstName || session.name, // First name
      fullName: session.fullName || session.name, // Full name (for sidebar)
      email: session.email,
      avatar: session.avatar || null, // Avatar URL or base64 data from Azure AD
    });
  } catch (error) {
    console.error('User profile error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

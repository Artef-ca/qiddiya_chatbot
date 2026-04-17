import { NextRequest, NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/auth/session';
import { createServiceProvider, createIdentityProvider } from '@/lib/auth/saml-config';
import { revokeUserLoginSession } from '@/lib/db/user-login-sessions';

/** Helper: Clear all auth and app cookies on the response */
function clearAuthCookiesOnResponse(response: NextResponse): NextResponse {
  const cookieOptions = {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
  response.cookies.set('session', '', cookieOptions);
  response.cookies.set('token', '', cookieOptions);
  // Clear SAML request ID used during login flow
  response.cookies.set('saml_request_id', '', cookieOptions);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      const response = NextResponse.json({ success: true });
      clearAuthCookiesOnResponse(response);
      return response;
    }

    if (session.userId) {
      await revokeUserLoginSession(session.userId);
    }

    // If SAML session index exists, perform SAML logout
    if (session.samlSessionIndex) {
      const sp = createServiceProvider();
      const idp = createIdentityProvider();

      return new Promise<NextResponse>((resolve, reject) => {
        sp.create_logout_request_url(
          idp,
          {
            name_id: session.userId,
            session_index: session.samlSessionIndex,
          },
          (err: Error | null, logoutUrl: string) => {
            if (err) {
              console.error('SAML logout error:', err);
              const response = NextResponse.json({ success: true });
              clearAuthCookiesOnResponse(response);
              resolve(response);
              return;
            }

            // Redirect to SAML logout URL with cookies cleared
            const response = NextResponse.redirect(logoutUrl);
            clearAuthCookiesOnResponse(response);
            resolve(response);
          }
        );
      });
    } else {
      await deleteSession();
      const response = NextResponse.json({ success: true });
      clearAuthCookiesOnResponse(response);
      return response;
    }
  } catch (error) {
    console.error('Logout error:', error);
    try {
      await deleteSession();
    } catch {
      // Ignore
    }
    const response = NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
    clearAuthCookiesOnResponse(response);
    return response;
  }
}

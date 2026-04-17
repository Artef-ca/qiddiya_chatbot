import { NextRequest, NextResponse } from 'next/server';
import { createServiceProvider, createIdentityProvider } from '@/lib/auth/saml-config';

export async function GET(request: NextRequest) {
  try {
    const sp = createServiceProvider();
    const idp = createIdentityProvider();

    // Generate SAML authentication request
    return new Promise<NextResponse>((resolve, reject) => {
      sp.create_login_request_url(idp, {}, (err: Error | null, loginUrl: string, requestId: string) => {
        if (err) {
          console.error('SAML login request error:', err);
          reject(
            NextResponse.json(
              { error: 'Failed to create SAML login request' },
              { status: 500 }
            )
          );
          return;
        }

        // Store requestId in session/cookie for validation during callback
        const response = NextResponse.redirect(loginUrl);

        // Store requestId in a cookie for validation
        if (requestId) {
          response.cookies.set('saml_request_id', requestId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 300, // 5 minutes
            path: '/',
          });
        }

        resolve(response);
      });
    });
  } catch (error) {
    console.error('SAML login error:', error);
    return NextResponse.json(
      { error: 'SAML configuration error' },
      { status: 500 }
    );
  }
}

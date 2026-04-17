import { NextRequest, NextResponse } from 'next/server';
import { createServiceProvider, createIdentityProvider } from '@/lib/auth/saml-config';
import { createSession } from '@/lib/auth/session';
import { getPublicOrigin } from '@/lib/auth/getPublicOrigin';

export async function POST(request: NextRequest) {
  try {
    console.log('SAML callback received');

    const origin = getPublicOrigin(request);

    const sp = createServiceProvider();
    const idp = createIdentityProvider();

    // Get SAML response from form data
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse');
    const relayState = formData.get('RelayState');

    console.log('SAML Response received:', samlResponse ? 'Yes' : 'No');
    console.log('SAML Response type:', typeof samlResponse);
    console.log('SAML Response length:', samlResponse ? String(samlResponse).length : 0);
    console.log('RelayState:', relayState);

    if (!samlResponse || typeof samlResponse !== 'string') {
      console.error('Missing or invalid SAMLResponse in form data');
      return NextResponse.json(
        { error: 'Missing SAMLResponse' },
        { status: 400 }
      );
    }

    // Get stored request ID from cookie
    const requestId = request.cookies.get('saml_request_id')?.value;
    console.log('Request ID from cookie:', requestId ? 'Found' : 'Not found');

    // Build the options object that saml2-js expects
    // post_assert expects options.request_body.SAMLResponse, not options.SAMLResponse
    const requestBody: any = {
      SAMLResponse: String(samlResponse), // Ensure it's a string
    };
    if (relayState) {
      requestBody.RelayState = String(relayState);
    }

    const options = {
      request_body: requestBody,
      allow_unencrypted_assertion: process.env.SAML_ALLOW_UNENCRYPTED !== 'false', // Allow unencrypted assertions (Azure AD default)
    };

    return new Promise<NextResponse>((resolve, reject) => {
      try {
        sp.post_assert(
          idp,
          options,
          (err: Error | null, samlAssertion: any) => {
            if (err) {
              console.error('SAML assertion validation error:', err);
              console.error('Error details:', JSON.stringify(err, null, 2));
              reject(
                NextResponse.redirect(
                  new URL('/login?error=authentication_failed', origin)
                )
              );
              return;
            }

            // Extract user information from SAML assertion
            const userAttributes = samlAssertion?.user || {};
            const nameId = samlAssertion?.user?.name_id || samlAssertion?.user?.nameID;
            const sessionIndex = samlAssertion?.session_index;

            Object.keys(userAttributes).forEach(key => {
              console.log(`${key}:`, userAttributes[key]);
            });
            console.log('===================================\n');

            // Helper function to check if a string is an email address
            const isEmail = (str: string): boolean => {
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
            };

            // Extract email first
            const email = userAttributes.email
              || userAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
              || userAttributes['http://schemas.microsoft.com/identity/claims/emailaddress']
              || (isEmail(nameId || '') ? nameId : '')
              || '';

            // Extract first name (givenName) - for welcome screen
            // Try multiple Azure AD claim types for first name
            let firstName = userAttributes.givenName
              || userAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']
              || userAttributes['http://schemas.microsoft.com/identity/claims/givenname']
              || '';

            // Extract last name (surname)
            const lastName = userAttributes.surname
              || userAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
              || userAttributes['http://schemas.microsoft.com/identity/claims/surname']
              || '';

            // Extract displayName from Azure AD (might be full name or just last name)
            const displayName = userAttributes['http://schemas.microsoft.com/identity/claims/displayname']
              || userAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
              || userAttributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/displayname']
              || userAttributes.displayName
              || userAttributes.name
              || '';

            // If firstName is still empty or is an email, extract from email (username part before @)
            // Only use the first part before any dot (first name only, not surname)
            if (!firstName || isEmail(firstName)) {
              if (email) {
                const emailUsername = email.split('@')[0];
                // Only take the first part before any dot (first name only)
                const firstNameFromEmail = emailUsername.split('.')[0];
                // Capitalize first letter
                firstName = firstNameFromEmail.charAt(0).toUpperCase() + firstNameFromEmail.slice(1).toLowerCase();
              }
            }

            // Construct fullName: prioritize firstName + lastName combination
            // Only use displayName if it contains both first and last name (has space) or if we don't have both parts
            let fullName = '';

            // First, try to construct from firstName + lastName (most reliable)
            if (firstName && lastName) {
              fullName = `${firstName} ${lastName}`.trim();
            } else if (firstName) {
              // If we only have firstName, use it
              fullName = firstName;
            } else if (lastName) {
              // If we only have lastName, use it (but this shouldn't happen ideally)
              fullName = lastName;
            }

            // If we still don't have a fullName, try displayName
            // But only if it's not an email and contains a space (likely full name, not just last name)
            if (!fullName || isEmail(fullName)) {
              if (displayName && !isEmail(displayName)) {
                // Check if displayName has a space (likely contains both first and last name)
                if (displayName.includes(' ')) {
                  fullName = displayName;
                } else if (firstName) {
                  // If displayName is single word and we have firstName, combine them
                  fullName = `${firstName} ${displayName}`.trim();
                } else {
                  // Last resort: use displayName even if single word
                  fullName = displayName;
                }
              }
            }

            // Final fallback: if fullName is still empty, use firstName
            if (!fullName || isEmail(fullName)) {
              fullName = firstName || '';
            }

            // Final fallback: if firstName is still email, use a generic greeting
            if (isEmail(firstName)) {
              firstName = ''; // Will show "Hey there" in the UI
            }

            // Extract avatar URL from Azure AD (if available)
            // Azure AD typically sends avatar in one of these claim types
            // If not available, will fallback to User icon in UI
            let avatar = userAttributes['http://schemas.microsoft.com/identity/claims/thumbnailphoto']
              || userAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/thumbnailphoto']
              || userAttributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/thumbnailphoto']
              || userAttributes.thumbnailphoto
              || userAttributes.picture
              || userAttributes.photo
              || userAttributes.avatar
              || null;

            // If avatar is a base64 string, convert it to a data URL
            if (avatar && typeof avatar === 'string' && !avatar.startsWith('http') && !avatar.startsWith('data:')) {
              // Check if it's base64 encoded (likely if length > 100)
              if (avatar.length > 100) {
                avatar = `data:image/jpeg;base64,${avatar}`;
              }
            }

            // Map SAML attributes to user data
            const userData = {
              userId: nameId || userAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || email || '',
              email: email,
              name: firstName, // First name only (for backward compatibility and welcome screen)
              firstName: firstName, // First name only
              fullName: fullName, // Full name (for sidebar)
              avatar: avatar, // Avatar URL or base64 data
              samlSessionIndex: sessionIndex,
            };

            // Validate required fields
            if (!userData.userId || !userData.email) {
              console.error('Missing required user data from SAML assertion');
              reject(
                NextResponse.redirect(
                  new URL('/login?error=missing_user_data', origin)
                )
              );
              return;
            }

            // Create session token and set cookie on redirect response
            createSession(userData)
              .then((token) => {
                console.log('Session token created successfully');

                // Create redirect response with session cookie
                // Add auth=success query param to indicate successful authentication
                const redirectPath = relayState && typeof relayState === 'string' ? relayState : '/';
                const redirectUrl = new URL(redirectPath, origin);
                const response = NextResponse.redirect(redirectUrl.toString());

                // Set session cookie directly on the response
                response.cookies.set('session', token, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 7, // 7 days
                  path: '/',
                });

                // Clear the request ID cookie
                response.cookies.delete('saml_request_id');
                console.log('Session cookie set, redirecting...');
                resolve(response);
              })
              .catch((sessionError) => {
                console.error('Session creation error:', sessionError);
                console.error('Error stack:', sessionError instanceof Error ? sessionError.stack : 'No stack trace');
                reject(
                  NextResponse.redirect(
                    new URL('/login?error=session_creation_failed', origin)
                  )
                );
              });
          }
        );
      } catch (assertError) {
        console.error('Error calling post_assert:', assertError);
        reject(
          NextResponse.redirect(
            new URL('/login?error=authentication_failed', origin)
          )
        );
      }
    });
  } catch (error) {
    console.error('SAML callback error:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.redirect(
      new URL('/login?error=callback_error', origin)
    );
  }
}

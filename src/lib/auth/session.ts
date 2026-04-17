import { randomUUID } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isLoginSessionDbEnforced } from '@/lib/auth/session-enforcement';
import {
  isUserSessionJtiValid,
  setUserActiveSessionJti,
} from '@/lib/db/user-login-sessions';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
  userId: string;
  email: string;
  name: string; // First name only (for backward compatibility)
  firstName?: string; // First name only
  fullName?: string; // Full name (first + last)
  avatar?: string | null; // Avatar URL or base64 data
  samlSessionIndex?: string;
  [key: string]: any;
}

// Create a session token (new jti overwrites DB row → prior browsers/devices lose access)
export async function createSession(data: SessionData): Promise<string> {
  const secret = new TextEncoder().encode(SECRET_KEY);
  const jti = randomUUID();

  const token = await new SignJWT(data)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setJti(jti)
    .sign(secret);

  if (isLoginSessionDbEnforced() && data.userId) {
    await setUserActiveSessionJti(data.userId, jti);
  }

  return token;
}

// Verify and decode session token (JWT must match server-side active jti when DB is configured)
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const secret = new TextEncoder().encode(SECRET_KEY);
    const { payload } = await jwtVerify(token, secret);
    const data = payload as SessionData & { jti?: string };

    if (isLoginSessionDbEnforced()) {
      const jti = typeof data.jti === 'string' ? data.jti : undefined;
      const userId = data.userId;
      if (!jti || !userId) {
        return null;
      }
      const ok = await isUserSessionJtiValid(userId, jti);
      if (!ok) {
        return null;
      }
    }

    return data as SessionData;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

// Get session from cookies (server-side)
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

// Set session cookie (server-side)
export async function setSession(data: SessionData): Promise<void> {
  const token = await createSession(data);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

// Delete session cookie (server-side)
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Client-side session helpers (for API calls)
export async function getSessionFromRequest(request: Request): Promise<SessionData | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map((c) => {
      const [key, ...rest] = c.split('=');
      return [key, rest.join('=')];
    })
  );

  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }

  return verifySession(token);
}

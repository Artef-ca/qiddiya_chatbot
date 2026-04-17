import { isDbConfigured } from '@/lib/db';

/**
 * Postgres-backed single active login (JWT `jti` in `user_login_sessions`).
 *
 * - Non-production (`NODE_ENV !== 'production'`): **never** uses the DB for auth
 *   session tracking, so local machines without Cloud SQL / DB access can always
 *   complete SAML login. Opt-in: set `AUTH_FORCE_SINGLE_SESSION_IN_DEV=true` to
 *   match production behaviour when you have a local DB and the table created.
 *
 * - Production (`NODE_ENV === 'production'`): **always** enforced — new login
 *   overwrites the stored `jti`, so older browsers/devices lose access. This
 *   requires DB env vars and `user_login_sessions`; if the DB is unreachable,
 *   session creation fails (fail closed for security).
 */
export function isLoginSessionDbEnforced(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return process.env.AUTH_FORCE_SINGLE_SESSION_IN_DEV === 'true';
  }

  if (!isDbConfigured()) {
    console.error(
      '[auth] Production requires DB env (INSTANCE_CONNECTION_NAME, DB_USER, DB_PASSWORD, DB_NAME) for login session invalidation.'
    );
  }

  return true;
}

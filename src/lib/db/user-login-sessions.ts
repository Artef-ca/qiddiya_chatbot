import { getPool } from '@/lib/db';
import { isLoginSessionDbEnforced } from '@/lib/auth/session-enforcement';

/** Schema where auth tables live (same as consent / sessions) */
const SCHEMA = 'qbrain_dev';

/**
 * One row per user: the JWT `jti` of their only allowed browser session.
 * New login overwrites this value; older browsers keep an expired cookie+JTI pair and fail verification.
 */
export async function setUserActiveSessionJti(userId: string, sessionJti: string): Promise<void> {
  if (!isLoginSessionDbEnforced()) return;

  const pool = getPool();
  await pool.query(
    `INSERT INTO ${SCHEMA}.user_login_sessions (user_id, session_jti, created_at, updated_at)
     VALUES ($1, $2, now(), now())
     ON CONFLICT (user_id)
     DO UPDATE SET session_jti = $2, updated_at = now()`,
    [userId, sessionJti]
  );
}

export async function isUserSessionJtiValid(userId: string, sessionJti: string): Promise<boolean> {
  if (!isLoginSessionDbEnforced()) return true;

  const pool = getPool();
  const result = (await pool.query(
    `SELECT session_jti FROM ${SCHEMA}.user_login_sessions WHERE user_id = $1`,
    [userId]
  )) as { rows: { session_jti: string }[] };

  const row = result.rows?.[0];
  return !!row && row.session_jti === sessionJti;
}

/** Clears server-side session slot so the cookie JWT is no longer accepted (after logout). */
export async function revokeUserLoginSession(userId: string): Promise<void> {
  if (!isLoginSessionDbEnforced()) return;

  const pool = getPool();
  await pool.query(`DELETE FROM ${SCHEMA}.user_login_sessions WHERE user_id = $1`, [userId]);
}

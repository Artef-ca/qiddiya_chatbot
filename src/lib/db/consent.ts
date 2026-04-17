import { getPool, isDbConfigured } from '@/lib/db';

const SCHEMA = 'qbrain_dev';

export type ConsentStatus = 'accept' | 'decline';

export interface ConsentRow {
  user_id: string;
  user_name: string | null;
  consent: ConsentStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Get consent status for a user.
 * Returns null if user is not in the table (needs to consent).
 */
export async function getConsent(userId: string): Promise<ConsentRow | null> {
  if (!isDbConfigured()) {
    return null;
  }

  const pool = getPool();
  const result = (await pool.query(
    `SELECT user_id, user_name, consent, created_at, updated_at
     FROM ${SCHEMA}.user_data_consent
     WHERE user_id = $1`,
    [userId]
  )) as { rows: ConsentRow[] };

  return result.rows?.[0] || null;
}

/**
 * Create or update consent record.
 * When reAcceptAfterDecline=true and consent='accept', resets created_at so user appears as new.
 */
export async function upsertConsent(
  userId: string,
  userName: string | null,
  consent: ConsentStatus,
  reAcceptAfterDecline?: boolean
): Promise<ConsentRow | null> {
  if (!isDbConfigured()) {
    return null;
  }

  const pool = getPool();
  const resetCreatedAt = reAcceptAfterDecline && consent === 'accept';
  const result = (await pool.query(
    `INSERT INTO ${SCHEMA}.user_data_consent (user_id, user_name, consent, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now())
     ON CONFLICT (user_id)
     DO UPDATE SET
       user_name = COALESCE($2, user_data_consent.user_name),
       consent = $3,
       updated_at = now(),
       created_at = CASE WHEN $4::boolean THEN now() ELSE user_data_consent.created_at END
     RETURNING user_id, user_name, consent, created_at, updated_at`,
    [userId, userName ?? null, consent, resetCreatedAt]
  )) as { rows: ConsentRow[] };

  return result.rows?.[0] || null;
}

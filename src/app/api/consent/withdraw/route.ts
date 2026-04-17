import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { getPool, isDbConfigured } from '@/lib/db';
import { upsertConsent } from '@/lib/db/consent';

const SCHEMA = 'qbrain_dev';

/**
 * POST /api/consent/withdraw
 * Withdraw consent: delete ONLY user's displayable data (Conversations, Pinned Items, Groups).
 * Consent record is UPDATED to 'decline' (not deleted). When user re-accepts, they appear as new.
 *
 * Deleted: sessions (conversations), events (messages), pinned_items, groups
 * Not touched: user_data_consent (updated only), auth, user profile
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.userId;

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const pool = getPool();

  try {
    // 1. Delete events for all sessions of this user
    await pool.query(
      `DELETE FROM ${SCHEMA}.events
       WHERE session_id IN (SELECT id FROM ${SCHEMA}.sessions WHERE user_id = $1)`,
      [userId]
    );

    // 2. Delete sessions (conversations)
    await pool.query(
      `DELETE FROM ${SCHEMA}.sessions WHERE user_id = $1`,
      [userId]
    );

    // 3. Delete pinned items
    await pool.query(
      `DELETE FROM ${SCHEMA}.pinned_items WHERE user_id = $1`,
      [userId]
    );

    // 4. Delete groups
    await pool.query(
      `DELETE FROM ${SCHEMA}."groups" WHERE user_id = $1`,
      [userId]
    );

    // 5. Update consent to decline
    await upsertConsent(userId, null, 'decline');

    return NextResponse.json({
      success: true,
      message: 'All data deleted and consent withdrawn',
    });
  } catch (error) {
    console.error('[consent withdraw]', error);
    return NextResponse.json(
      { error: 'Failed to withdraw consent and delete data' },
      { status: 500 }
    );
  }
}

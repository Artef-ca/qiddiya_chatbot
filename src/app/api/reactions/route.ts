import { NextRequest, NextResponse } from 'next/server';
import { getPool, isDbConfigured } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { isUUID } from '@/lib/utils/id';

const SCHEMA = 'qbrain_dev';

type FeedbackState = {
  isFlagged: boolean;
  isDisliked: boolean;
};

// Fallback in-memory store for local/dev when DB is not configured.
// Keyed by `${userId}:${eventId}` so feedback persists across requests during the same server process.
const feedbackStore = new Map<string, FeedbackState>();

function feedbackKey(userId: string, eventId: string) {
  return `${userId}:${eventId}`;
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json()) as { eventId?: string; action?: 'flag' | 'dislike' };
  const { eventId, action } = body;

  if (!eventId || typeof eventId !== 'string' || !action) {
    return NextResponse.json({ error: 'eventId and action required' }, { status: 400 });
  }

  if (action !== 'flag' && action !== 'dislike') {
    return NextResponse.json({ error: 'action must be flag or dislike' }, { status: 400 });
  }

  // Local/dev fallback without DB configured.
  if (!isDbConfigured()) {
    const key = feedbackKey(session.userId, eventId);
    const current = feedbackStore.get(key) ?? { isFlagged: false, isDisliked: false };

    const next: FeedbackState =
      action === 'flag'
        ? { ...current, isFlagged: !current.isFlagged }
        : { ...current, isDisliked: !current.isDisliked };

    feedbackStore.set(key, next);
    return NextResponse.json(next, { status: 200 });
  }

  // DB mode: only allow toggling feedback for assistant responses owned by this user.
  if (!isUUID(eventId)) {
    return NextResponse.json({ error: 'eventId must be a UUID' }, { status: 400 });
  }

  const pool = getPool();

  try {
    if (action === 'flag') {
      const r = await pool.query(
        `UPDATE ${SCHEMA}.events
         SET is_flagged = NOT is_flagged
         WHERE id = $1
           AND user_id = $2
           AND author IN ('root_agent', 'model')
         RETURNING
           COALESCE(is_flagged, false) as is_flagged,
           COALESCE(is_disliked, false) as is_disliked`,
        [eventId, session.userId]
      );

      const row = r.rows?.[0] as { is_flagged: boolean; is_disliked: boolean } | undefined;
      if (!row) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      return NextResponse.json(
        { isFlagged: row.is_flagged === true, isDisliked: row.is_disliked === true },
        { status: 200 }
      );
    }

    // action === 'dislike'
    const r = await pool.query(
      `UPDATE ${SCHEMA}.events
       SET is_disliked = NOT is_disliked
       WHERE id = $1
         AND user_id = $2
         AND author IN ('root_agent', 'model')
       RETURNING
         COALESCE(is_flagged, false) as is_flagged,
         COALESCE(is_disliked, false) as is_disliked`,
      [eventId, session.userId]
    );

    const row = r.rows?.[0] as { is_flagged: boolean; is_disliked: boolean } | undefined;
    if (!row) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(
      { isFlagged: row.is_flagged === true, isDisliked: row.is_disliked === true },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update reaction' },
      { status: 500 }
    );
  }
}


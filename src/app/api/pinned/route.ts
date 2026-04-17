import { NextRequest, NextResponse } from 'next/server';
import { getPool, isDbConfigured } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';

const SCHEMA = 'qbrain_dev';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function requireUserId(request: NextRequest): Promise<string | NextResponse> {
  if (!isDbConfigured()) {
    return errorResponse('Database not configured', 503);
  }
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return errorResponse('Not authenticated', 401);
  }
  return session.userId;
}

function serializePinnedItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    messageId: row.messageId,
    conversationId: row.conversationId,
    content: row.content,
    title: row.title ?? undefined,
    note: row.note ?? undefined,
    type: row.type,
    pinnedAt: row.pinnedAt instanceof Date ? row.pinnedAt.toISOString() : row.pinnedAt,
  };
}

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  if (typeof userId !== 'string') {
    return userId;
  }
  try {
    const pool = getPool();
    const r = await pool.query(
      `SELECT id, message_id as "messageId", session_id as "conversationId", content, title, note, type, pinned_at as "pinnedAt", sort_order as "sortOrder"
       FROM ${SCHEMA}.pinned_items
       WHERE user_id = $1
       ORDER BY sort_order ASC, pinned_at DESC`,
      [userId]
    );
    const rows = (r.rows || []) as Record<string, unknown>[];
    const items = rows.map(serializePinnedItem);
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[pinned GET]', e);
    // When running locally without Cloud SQL (e.g. ENOENT on socket), return empty items
    // so the app works in dev even when DB env vars are set but connection fails
    const err = e as NodeJS.ErrnoException;
    const isConnectionError =
      err?.code === 'ENOENT' ||
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'ETIMEDOUT' ||
      (typeof err?.message === 'string' && err.message.includes('connect ENOENT'));
    if (isConnectionError) {
      return NextResponse.json({ items: [] });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch pinned items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);
  if (typeof userId !== 'string') {
    return userId;
  }
  try {
    const body = (await request.json()) as {
      messageId: string;
      conversationId: string;
      content: string;
      title?: string;
      note?: string;
      type: 'message' | 'response';
    };
    const { messageId, conversationId, content, type } = body;
    if (!messageId || !conversationId || !content || !type) {
      return NextResponse.json(
        { error: 'messageId, conversationId, content, type required' },
        { status: 400 }
      );
    }
    const pool = getPool();
    const r = await pool.query(
      `INSERT INTO ${SCHEMA}.pinned_items (user_id, session_id, message_id, content, title, note, type, sort_order)
       SELECT $1::varchar, $2::uuid, $3::varchar, $4::text, $5::varchar, $6::text, $7::varchar,
              COALESCE((SELECT MAX(sort_order) FROM ${SCHEMA}.pinned_items WHERE user_id = $1), -1) + 1
       RETURNING id, message_id as "messageId", session_id as "conversationId", content, title, note, type, pinned_at as "pinnedAt"`,
      [userId, conversationId, messageId, content, body.title ?? null, body.note ?? null, type]
    );
    const row = r.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
    }
    const item = serializePinnedItem(row);
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error('[pinned POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create pinned item' },
      { status: 500 }
    );
  }
}

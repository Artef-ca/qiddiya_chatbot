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

function serializeGroup(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    conversationIds: Array.isArray(row.conversationIds) ? row.conversationIds : [],
    starred: !!row.starred,
    archived: !!row.archived,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
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
      `SELECT id, name, conversation_ids as "conversationIds", starred, archived, created_at as "createdAt", updated_at as "updatedAt", sort_order as "sortOrder"
       FROM ${SCHEMA}."groups"
       WHERE user_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [userId]
    );
    const rows = (r.rows || []) as Record<string, unknown>[];
    const list = rows.map(serializeGroup);
    return NextResponse.json(list);
  } catch (e) {
    console.error('[groups GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch groups' },
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
    const body = (await request.json()) as { name: string };
    const name = body?.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const pool = getPool();
    const r = await pool.query(
      `INSERT INTO ${SCHEMA}."groups" (user_id, name, conversation_ids)
       VALUES ($1, $2, '[]'::jsonb)
       RETURNING id, name, conversation_ids as "conversationIds", starred, archived, created_at as "createdAt", updated_at as "updatedAt"`,
      [userId, name]
    );
    const row = r.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
    }
    const group = serializeGroup(row);
    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    console.error('[groups POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create group' },
      { status: 500 }
    );
  }
}

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

async function getGroup(pool: Awaited<ReturnType<typeof getPool>>, groupId: string, userId: string) {
  const r = await pool.query(
    `SELECT id, name, conversation_ids as "conversationIds" FROM ${SCHEMA}."groups" WHERE id = $1::uuid AND user_id = $2`,
    [groupId, userId]
  );
  return r.rows?.[0] as { id: string; name: string; conversationIds: string[] } | undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const userId = await requireUserId(request);
  if (typeof userId !== 'string') {
    return userId;
  }
  const { groupId } = await params;
  try {
    const body = (await request.json()) as { conversationIds: string[] };
    const toAdd = Array.isArray(body?.conversationIds) ? body.conversationIds : [];
    if (toAdd.length === 0) {
      return NextResponse.json({ error: 'conversationIds required (array)' }, { status: 400 });
    }
    const pool = getPool();
    const row = await getGroup(pool, groupId, userId);
    if (!row) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    const arr = Array.isArray(row.conversationIds) ? [...row.conversationIds] : [];
    toAdd.forEach((id) => {
      if (id && !arr.includes(id)) arr.push(id);
    });
    await pool.query(
      `UPDATE ${SCHEMA}."groups" SET conversation_ids = $1::jsonb WHERE id = $2::uuid AND user_id = $3`,
      [JSON.stringify(arr), groupId, userId]
    );
    return NextResponse.json({ id: row.id, name: row.name, conversationIds: arr });
  } catch (e) {
    console.error('[groups/conversations POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to add conversations' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const userId = await requireUserId(request);
  if (typeof userId !== 'string') {
    return userId;
  }
  const { groupId } = await params;
  try {
    const body = (await request.json()) as { conversationIds: string[] };
    const toRemove = Array.isArray(body?.conversationIds) ? body.conversationIds : [];
    if (toRemove.length === 0) {
      return NextResponse.json({ error: 'conversationIds required (array)' }, { status: 400 });
    }
    const pool = getPool();
    const row = await getGroup(pool, groupId, userId);
    if (!row) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    const arr = Array.isArray(row.conversationIds) ? row.conversationIds : [];
    const set = new Set(toRemove);
    const next = arr.filter((id) => !set.has(id));
    await pool.query(
      `UPDATE ${SCHEMA}."groups" SET conversation_ids = $1::jsonb WHERE id = $2::uuid AND user_id = $3`,
      [JSON.stringify(next), groupId, userId]
    );
    return NextResponse.json({ id: row.id, name: row.name, conversationIds: next });
  } catch (e) {
    console.error('[groups/conversations DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to remove conversations' },
      { status: 500 }
    );
  }
}

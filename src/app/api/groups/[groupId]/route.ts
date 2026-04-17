import { NextRequest, NextResponse } from 'next/server';
import { getPool, isDbConfigured } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';

const SCHEMA = 'qbrain_dev';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { groupId } = await params;
  try {
    const body = (await request.json()) as { name?: string; starred?: boolean; archived?: boolean };
    const pool = getPool();
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (body.name !== undefined) {
      updates.push(`name = $${i++}`);
      values.push(body.name);
    }
    if (body.starred !== undefined) {
      updates.push(`starred = $${i++}`);
      values.push(body.starred);
    }
    if (body.archived !== undefined) {
      updates.push(`archived = $${i++}`);
      values.push(body.archived);
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    values.push(groupId, session.userId);
    const whereId = i;
    const whereUser = i + 1;
    const r = await pool.query(
      `UPDATE ${SCHEMA}."groups"
       SET ${updates.join(', ')}
       WHERE id = $${whereId}::uuid AND user_id = $${whereUser}
       RETURNING id, name, conversation_ids as "conversationIds", starred, archived, created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );
    const row = r.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    const group = {
      id: row.id,
      name: row.name,
      conversationIds: Array.isArray(row.conversationIds) ? row.conversationIds : [],
      starred: !!row.starred,
      archived: !!row.archived,
      createdAt: row.createdAt instanceof Date ? (row.createdAt as Date).toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? (row.updatedAt as Date).toISOString() : row.updatedAt,
    };
    return NextResponse.json(group);
  } catch (e) {
    console.error('[groups PATCH]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update group' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const session = await getSessionFromRequest(_request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { groupId } = await params;
  try {
    const pool = getPool();
    const r = await pool.query(
      `DELETE FROM ${SCHEMA}."groups" WHERE id = $1::uuid AND user_id = $2 RETURNING id`,
      [groupId, session.userId]
    );
    if (!r.rows?.length) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[groups DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete group' },
      { status: 500 }
    );
  }
}

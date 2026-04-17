import { NextRequest, NextResponse } from 'next/server';
import { getPool, isDbConfigured } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';

const SCHEMA = 'qbrain_dev';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = (await request.json()) as { title?: string; note?: string };
    const pool = getPool();
    const r = await pool.query(
      `UPDATE ${SCHEMA}.pinned_items
       SET title = COALESCE($2, title), note = COALESCE($3, note)
       WHERE id = $1::uuid AND user_id = $4
       RETURNING id, message_id as "messageId", session_id as "conversationId", content, title, note, type, pinned_at as "pinnedAt"`,
      [id, body.title ?? null, body.note ?? null, session.userId]
    );
    const row = r.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      return NextResponse.json({ error: 'Pinned item not found' }, { status: 404 });
    }
    const item = {
      id: row.id,
      messageId: row.messageId,
      conversationId: row.conversationId,
      content: row.content,
      title: row.title ?? undefined,
      note: row.note ?? undefined,
      type: row.type,
      pinnedAt: row.pinnedAt instanceof Date ? (row.pinnedAt as Date).toISOString() : row.pinnedAt,
    };
    return NextResponse.json(item);
  } catch (e) {
    console.error('[pinned PATCH]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update pinned item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const session = await getSessionFromRequest(_request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const pool = getPool();
    const r = await pool.query(
      `DELETE FROM ${SCHEMA}.pinned_items WHERE id = $1::uuid AND user_id = $2 RETURNING id`,
      [id, session.userId]
    );
    if (!r.rows?.length) {
      return NextResponse.json({ error: 'Pinned item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[pinned DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete pinned item' },
      { status: 500 }
    );
  }
}

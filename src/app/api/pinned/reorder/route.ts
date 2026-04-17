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

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);
  if (typeof userId !== 'string') {
    return userId;
  }
  try {
    const body = (await request.json()) as { activeId: string; overId: string };
    const { activeId, overId } = body;
    if (!activeId || !overId) {
      return NextResponse.json({ error: 'activeId and overId required' }, { status: 400 });
    }
    const pool = getPool();
    const list = await pool.query(
      `SELECT id, sort_order FROM ${SCHEMA}.pinned_items WHERE user_id = $1 ORDER BY sort_order ASC, pinned_at ASC`,
      [userId]
    );
    const rows = (list.rows || []) as { id: string; sort_order: number }[];
    const activeIdx = rows.findIndex((r) => r.id === activeId);
    const overIdx = rows.findIndex((r) => r.id === overId);
    if (activeIdx === -1 || overIdx === -1) {
      return NextResponse.json({ error: 'Invalid item IDs' }, { status: 400 });
    }
    const [removed] = rows.splice(activeIdx, 1);
    // Keep the original over index from the pre-removal list.
    // This matches client behavior and allows top-to-bottom moves to land correctly.
    rows.splice(overIdx, 0, removed);
    for (let i = 0; i < rows.length; i++) {
      await pool.query(
        `UPDATE ${SCHEMA}.pinned_items SET sort_order = $2 WHERE id = $1::uuid AND user_id = $3`,
        [rows[i].id, i, userId]
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[pinned reorder POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to reorder pinned items' },
      { status: 500 }
    );
  }
}

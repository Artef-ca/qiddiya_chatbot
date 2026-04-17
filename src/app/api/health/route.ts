import { NextResponse } from 'next/server';
import { getPool, isDbConfigured } from '@/lib/db';

export async function GET() {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { status: 'ok', db: 'unconfigured' },
        { status: 200 }
      );
    }

    const pool = getPool();
    await pool.query('SELECT 1');
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    console.error('[health GET]', e);
    return NextResponse.json(
      {
        status: 'error',
        db: 'error',
        message: e instanceof Error ? e.message : 'Database connection failed',
      },
      { status: 503 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { getConsent, upsertConsent } from '@/lib/db/consent';
import { isDbConfigured } from '@/lib/db';

/**
 * GET /api/consent
 * Returns the consent status for the current user (prod/deployed only - local uses localStorage).
 * - { consent: 'accept' } → user has accepted, show welcome normally
 * - { consent: 'decline' } → user declined, show consent popup (or redirect)
 * - { consent: null } → user not in table, show consent popup
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // DB not configured - allow through (edge case for local without DB)
  if (!isDbConfigured()) {
    return NextResponse.json({ consent: 'accept', needsConsent: false });
  }

  try {
    const row = await getConsent(session.userId);
    if (!row) {
      return NextResponse.json({ consent: null, needsConsent: true });
    }
    return NextResponse.json({
      consent: row.consent,
      needsConsent: row.consent !== 'accept',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error('[consent GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch consent status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consent
 * Accept or decline consent (prod/deployed only - local uses localStorage).
 * Body: { action: 'accept' | 'decline' }
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { action?: string };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    body = {};
  }
  const action = body?.action;
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json(
      { error: 'action must be "accept" or "decline"' },
      { status: 400 }
    );
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const userName = session.fullName || session.name || session.firstName || null;
    const existing = await getConsent(session.userId);
    const reAcceptAfterDecline = action === 'accept' && existing?.consent === 'decline';
    const row = await upsertConsent(session.userId, userName, action, reAcceptAfterDecline);
    if (!row) {
      return NextResponse.json(
        { error: 'Failed to save consent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      consent: row.consent,
    });
  } catch (error) {
    console.error('[consent POST]', error);
    return NextResponse.json(
      { error: 'Failed to save consent' },
      { status: 500 }
    );
  }
}

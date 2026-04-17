import { NextRequest, NextResponse } from 'next/server';
import { getPool, isDbConfigured } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { mockConversations } from '@/data/mockConversations';
import { getSessions, getSessionTitle, getSessionStarred, getLastEventPreviewsForSessions } from '@/lib/db/sessions';
import type { Conversation, Message } from '@/types';

const SCHEMA = 'qbrain_dev';

// Helper to serialize dates for JSON responses
type SerializedMessage = Omit<Message, 'timestamp'> & { timestamp: string };
type SerializedConversation = Omit<Conversation, 'createdAt' | 'updatedAt' | 'messages'> & {
  createdAt: string;
  updatedAt: string;
  messages: SerializedMessage[];
};

// GET /api/conversations - List all conversations for the user
export async function GET(request: NextRequest) {
  // Check if database is configured
  if (!isDbConfigured()) {
    // Fallback to mock data if database is not configured
    console.log('[conversations GET] Database not configured, returning mock data');
    return NextResponse.json({
      conversations: mockConversations.map(conv => ({
        ...conv,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        messages: conv.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
      })),
      groups: [],
    });
  }

  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Sidebar: sessions list with last message preview for each. Full events loaded when user opens a conversation.
    const sessionRows = await getSessions(session.userId);
    const sessionIds = sessionRows.map((r) => r.id as string);
    const previews = await getLastEventPreviewsForSessions(session.userId, sessionIds);

    const conversations: SerializedConversation[] = [];

    for (const sessionRow of sessionRows) {
      const sessionId = sessionRow.id as string;
      const title = await getSessionTitle(sessionId);
      const starred = await getSessionStarred(sessionId);
      const preview = previews[sessionId];
      const updatedAt =
        sessionRow.update_time instanceof Date
          ? sessionRow.update_time.toISOString()
          : new Date(sessionRow.update_time as string).toISOString();

      // Use actual message content from events (prefer assistant response); never use title to avoid duplication
      conversations.push({
        id: sessionId,
        title,
        starred,
        archived: false,
        sessionId,
        createdAt: sessionRow.create_time instanceof Date
          ? sessionRow.create_time.toISOString()
          : new Date(sessionRow.create_time as string).toISOString(),
        updatedAt,
        messages: preview?.trim()
          ? [
              {
                id: 'preview',
                role: 'assistant' as const,
                content: preview.trim(),
                timestamp: updatedAt,
                isLoading: false,
                hasError: false,
              },
            ]
          : [],
      });
    }

    // Get groups from qbrain_dev."groups" (same schema as sessions)
    const pool = getPool();
    let groups: Array<{
      id: string;
      name: string;
      conversationIds: string[];
      starred: boolean;
      archived: boolean;
      createdAt: string;
      updatedAt: string;
    }> = [];
    try {
      const groupsResult = await pool.query(
        `SELECT id, name, conversation_ids as "conversationIds", starred, archived,
                created_at as "createdAt", updated_at as "updatedAt"
         FROM ${SCHEMA}."groups"
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [session.userId]
      );
      groups = (groupsResult.rows || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        conversationIds: Array.isArray(row.conversationIds) ? row.conversationIds : [],
        starred: !!row.starred,
        archived: !!row.archived,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      }));
    } catch (groupsErr) {
      console.warn('[conversations GET] groups table not available, returning empty groups:', groupsErr instanceof Error ? groupsErr.message : groupsErr);
    }

    return NextResponse.json({
      conversations,
      groups,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const pgCode = (e as { code?: string })?.code;
    console.error('[conversations GET] Error:', {
      message: err.message,
      stack: err.stack,
      pgCode: pgCode ?? 'N/A',
    });
    return NextResponse.json(
      { error: err.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation (Session)
export async function POST(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    let titleFromBody: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.title === 'string' && body.title.trim()) {
        titleFromBody = body.title.trim().slice(0, 50);
      }
    } catch {
      // no body or invalid JSON
    }

    const { createSession, updateSessionTitle } = await import('@/lib/db/sessions');
    const newSession = await createSession(session.userId);

    if (!newSession) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const sessionId = newSession.id as string;
    if (titleFromBody) {
      await updateSessionTitle(sessionId, session.userId, titleFromBody);
    }

    const title = titleFromBody ?? (await getSessionTitle(sessionId));
    const starred = await getSessionStarred(sessionId);

    const conversation: SerializedConversation = {
      id: sessionId,
      title,
      starred,
      archived: false,
      sessionId,
      createdAt: newSession.create_time instanceof Date 
        ? newSession.create_time.toISOString() 
        : new Date(newSession.create_time as string).toISOString(),
      updatedAt: newSession.update_time instanceof Date 
        ? newSession.update_time.toISOString() 
        : new Date(newSession.update_time as string).toISOString(),
      messages: [],
    };

    return NextResponse.json(conversation, { status: 201 });
  } catch (e) {
    console.error('[conversations POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

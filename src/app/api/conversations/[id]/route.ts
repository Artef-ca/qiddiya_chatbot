import { NextRequest, NextResponse } from 'next/server';
import { getPool, isDbConfigured } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { mockConversations } from '@/data/mockConversations';
import { getSessionById, getEvents, getSessionTitle, getSessionStarred } from '@/lib/db/sessions';
import type { Conversation, Message } from '@/types';

const SCHEMA = 'qbrain_dev';

// Serialized message type (timestamp as string for API storage)
type SerializedMessage = Omit<Message, 'timestamp'> & { timestamp: string };

// Serialized conversation type (dates as strings for API storage)
type SerializedConversation = Omit<Conversation, 'createdAt' | 'updatedAt' | 'messages'> & {
  createdAt: string;
  updatedAt: string;
  messages: SerializedMessage[];
};

// In-memory store for conversations (fallback when DB is not configured)
// This is kept for backward compatibility during migration
export const conversationStore: Map<string, SerializedConversation> = new Map();

// Initialize with mock conversations (fallback only)
mockConversations.forEach(conv => {
  conversationStore.set(conv.id, {
    ...conv,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: conv.messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    })),
  });
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[API Route] GET request for conversation ID: ${id}`);

    // Check if database is configured
    if (!isDbConfigured()) {
      // Fallback to mock data if database is not configured
      const mockConversation = mockConversations.find(c => c.id === id);
      if (mockConversation) {
        return NextResponse.json({
          ...mockConversation,
          id,
          createdAt: mockConversation.createdAt.toISOString(),
          updatedAt: mockConversation.updatedAt.toISOString(),
          messages: mockConversation.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString(),
          })),
          sessionId: (mockConversation as any).sessionId,
        });
      }

      // Check in-memory store
      const stored = conversationStore.get(id);
      if (stored) {
        return NextResponse.json({
          ...stored,
          id,
        });
      }

      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Use database
    const session = await getSessionFromRequest(request);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get session from sessions table
    const sessionRow = await getSessionById(id, session.userId);

    if (!sessionRow) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Load all events for this session (UUID); user and bot messages stored as separate events, returned in order
    const messages = await getEvents(id);
    const title = await getSessionTitle(id);
    const starred = await getSessionStarred(id);

    const conversation: SerializedConversation = {
      id: sessionRow.id as string,
      title: title,
      starred,
      archived: false, // Session table doesn't have archived field
      sessionId: sessionRow.id as string,
      createdAt: sessionRow.create_time instanceof Date 
        ? sessionRow.create_time.toISOString() 
        : new Date(sessionRow.create_time as string).toISOString(),
      updatedAt: sessionRow.update_time instanceof Date 
        ? sessionRow.update_time.toISOString() 
        : new Date(sessionRow.update_time as string).toISOString(),
      messages: messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
        isLoading: false, // Explicitly set to false for loaded messages (no typing animation)
        hasError: msg.hasError ?? false,
      })),
    };

    return NextResponse.json(conversation);
  } catch (error) {
    console.error(`[API Route] Error getting conversation:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH handler to update conversation (sessions table)
// Note: sessions table doesn't have title/starred/archived fields, so we only update timestamp
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      title?: string;
      starred?: boolean;
      archived?: boolean;
      sessionId?: string;
    };

    if (!isDbConfigured()) {
      // Fallback to in-memory store
      const stored = conversationStore.get(id);
      if (!stored) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      const updated: SerializedConversation = {
        ...stored,
        title: body.title !== undefined ? body.title : stored.title,
        starred: body.starred !== undefined ? body.starred : stored.starred,
        archived: body.archived !== undefined ? body.archived : stored.archived,
        sessionId: body.sessionId !== undefined ? body.sessionId : stored.sessionId,
        updatedAt: new Date().toISOString(),
      };

      conversationStore.set(id, updated);
      return NextResponse.json(updated);
    }

    // Use database
    const session = await getSessionFromRequest(request);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get session
    const sessionRow = await getSessionById(id, session.userId);
    if (!sessionRow) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const { updateSessionTimestamp, updateSessionTitle, updateSessionStarred } = await import('@/lib/db/sessions');
    await updateSessionTimestamp(id);
    if (body.title !== undefined) {
      await updateSessionTitle(id, session.userId, body.title);
    }
    if (body.starred !== undefined) {
      await updateSessionStarred(id, session.userId, body.starred);
    }

    // Get updated session and messages
    const updatedSession = await getSessionById(id, session.userId);
    const messages = await getEvents(id);
    const title = await getSessionTitle(id);
    const starred = await getSessionStarred(id);

    const conversation: SerializedConversation = {
      id: updatedSession!.id as string,
      title: title,
      starred,
      archived: body.archived !== undefined ? body.archived : false,
      sessionId: updatedSession!.id as string,
      createdAt: updatedSession!.create_time instanceof Date 
        ? updatedSession!.create_time.toISOString() 
        : new Date(updatedSession!.create_time as string).toISOString(),
      updatedAt: updatedSession!.update_time instanceof Date 
        ? updatedSession!.update_time.toISOString() 
        : new Date(updatedSession!.update_time as string).toISOString(),
      messages: messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
        isLoading: false, // Explicitly set to false for loaded messages (no typing animation)
        hasError: msg.hasError ?? false,
      })),
    };

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT handler (kept for backward compatibility, but uses PATCH logic)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Redirect PUT to PATCH for consistency
  return PATCH(request, { params });
}

// DELETE handler to delete conversation (sessions table)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDbConfigured()) {
      // Fallback to in-memory store
      const exists = conversationStore.has(id);
      if (!exists) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      conversationStore.delete(id);
      return NextResponse.json({ success: true });
    }

    // Use database
    const session = await getSessionFromRequest(request);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const pool = getPool();

    // Delete events first (if there's no cascade delete)
    await pool.query(`DELETE FROM ${SCHEMA}.events WHERE session_id = $1`, [id]);

    // Delete session
    const { deleteSession } = await import('@/lib/db/sessions');
    const deleted = await deleteSession(id, session.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to update conversation in store (kept for backward compatibility)
export function updateConversationInStore(conversation: Conversation) {
  conversationStore.set(conversation.id, {
    ...conversation,
    createdAt: conversation.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: conversation.updatedAt?.toISOString() || new Date().toISOString(),
    messages: conversation.messages?.map((msg: Message) => ({
      ...msg,
      timestamp: msg.timestamp?.toISOString() || new Date().toISOString(),
    })) || [],
    sessionId: conversation.sessionId,
  });
}

// Helper function to update conversation sessionId
// Note: In sessions table, the id IS the sessionId, so this is mainly for compatibility
export async function updateConversationSessionId(
  conversationId: string,
  sessionId: string
): Promise<void> {
  if (!isDbConfigured()) {
    // Fallback to in-memory store
    const existing = conversationStore.get(conversationId);
    if (existing) {
      conversationStore.set(conversationId, {
        ...existing,
        sessionId,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // If not in store, check mock conversations
      const mockConversation = mockConversations.find(c => c.id === conversationId);
      if (mockConversation) {
        (mockConversation as any).sessionId = sessionId;
        (mockConversation as any).updatedAt = new Date();
      }
    }
    return;
  }

  // Use database - just update timestamp since sessionId is the id itself
  try {
    const { updateSessionTimestamp } = await import('@/lib/db/sessions');
    await updateSessionTimestamp(conversationId);
  } catch (error) {
    console.error('Error updating conversation sessionId:', error);
    throw error;
  }
}

import { mockConversations } from '@/data/mockConversations';
import { CONSTANTS } from './constants';

/**
 * Update conversation sessionId in store
 * This function updates the sessionId in the main conversationStore (from conversations/[id]/route.ts)
 */
export async function updateConversationSessionId(
  conversationId: string,
  sessionId: string
): Promise<void> {
  console.log('[updateConversationSessionId] Updating sessionId:', { conversationId, sessionId });
  
  try {
    // Import the main conversationStore from conversations route
    const { conversationStore } = await import('@/app/api/conversations/[id]/route');
    
    // Check if conversation exists in main store
    const existing = conversationStore.get(conversationId);
    if (existing) {
      conversationStore.set(conversationId, {
        ...existing,
        sessionId,
        updatedAt: new Date().toISOString(),
      });
      console.log('[updateConversationSessionId] Updated sessionId in conversationStore');
      return;
    }
    
    // If not in store, check mock conversations
    const mockConversation = mockConversations.find(c => c.id === conversationId);
    if (mockConversation) {
      // Update mock conversation (in development only)
      (mockConversation as any).sessionId = sessionId;
      (mockConversation as any).updatedAt = new Date();
      console.log('[updateConversationSessionId] Updated sessionId in mock conversation');
    } else {
      // Create a new entry in the store if conversation doesn't exist
      conversationStore.set(conversationId, {
        id: conversationId,
        title: CONSTANTS.DEFAULT_CONVERSATION_TITLE,
        sessionId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        messages: [],
      });
      console.log('[updateConversationSessionId] Created new entry in conversationStore with sessionId');
    }
  } catch (error) {
    console.error('[updateConversationSessionId] Error updating sessionId:', error);
    // Fallback: update mock conversation if available
    const mockConversation = mockConversations.find(c => c.id === conversationId);
    if (mockConversation) {
      (mockConversation as any).sessionId = sessionId;
      (mockConversation as any).updatedAt = new Date();
      console.log('[updateConversationSessionId] Fallback: Updated sessionId in mock conversation');
    }
  }
}

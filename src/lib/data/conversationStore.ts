import type { Conversation } from '@/types';
import { mockConversations } from '@/data/mockConversations';

// Shared in-memory store for conversations
// This allows both MSW handlers (client-side) and API routes (server-side) to access the same data
class ConversationStore {
  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    // Initialize with mock conversations
    mockConversations.forEach(conv => {
      this.conversations.set(conv.id, conv);
    });
  }

  get(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  set(conversation: Conversation): void {
    this.conversations.set(conversation.id, conversation);
  }

  getAll(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  delete(id: string): boolean {
    return this.conversations.delete(id);
  }

  clear(): void {
    this.conversations.clear();
  }
}

// Export a singleton instance
// Note: In a real application, this would be replaced by a database
// In development, this works because Node.js modules are cached
// In production, you'd want to use a proper database
export const conversationStore = new ConversationStore();


import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toDate, deserializeDate } from '@/lib/utils/date';
import type { Message, Conversation } from '@/types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  /** IDs that were renamed (e.g. conv-xxx → UUID); hide these in sidebar to avoid duplicate entries */
  replacedConversationIds: string[];
}

// Type for conversation creation payload (dates can be strings for serialization)
type ConversationPayload = Omit<Conversation, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Type for serialized conversation (dates as strings for Redux)
type SerializedConversation = Omit<Conversation, 'createdAt' | 'updatedAt' | 'messages'> & {
  createdAt: string;
  updatedAt: string;
  messages: Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
};

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  replacedConversationIds: [],
};

/**
 * Normalize message content to string so UI never sees object/non-string (avoids .includes/.toLowerCase crashes).
 * String content is returned as-is — text, markdown, tables, charts, and other rich bot responses are unchanged.
 * Only non-string values are coerced; no impact on normal string content.
 */
function normalizeContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content == null) return '';
  if (typeof content === 'object') return JSON.stringify(content);
  return String(content);
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    createConversation: (state, action: PayloadAction<ConversationPayload>) => {
      // Convert ISO string dates to Date objects if needed
      const conversation: Conversation = {
        ...action.payload,
        createdAt: toDate(action.payload.createdAt),
        updatedAt: toDate(action.payload.updatedAt),
      };
      state.conversations.push(conversation);
      state.activeConversationId = action.payload.id;
    },
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    addMessage: (
      state,
      action: PayloadAction<{ conversationId: string; message: Message }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.id === action.payload.conversationId
      );
      if (conversation) {
        const msg = action.payload.message;
        conversation.messages.push({
          ...msg,
          content: normalizeContent(msg.content),
        });
        conversation.updatedAt = new Date();
      }
    },
    updateMessage: (
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        content: string;
        isLoading?: boolean;
        is_pro?: boolean;
        apiStatus?: number;
        eventId?: string;
      }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.id === action.payload.conversationId
      );
      if (conversation) {
        const message = conversation.messages.find(
          (msg) => msg.id === action.payload.messageId
        );
        if (message) {
          message.content = normalizeContent(action.payload.content);
          if (action.payload.is_pro !== undefined) {
            message.is_pro = action.payload.is_pro;
          }
          if (action.payload.eventId !== undefined) {
            message.eventId = action.payload.eventId;
          }
          if (action.payload.isLoading !== undefined) {
            message.isLoading = action.payload.isLoading;
            // Clear error state when setting loading to true (retry scenario)
            if (action.payload.isLoading === true && message.hasError) {
              message.hasError = false;
              message.errorMessage = undefined;
              message.errorType = undefined;
            }
          }
          if (action.payload.apiStatus !== undefined) {
            message.apiStatus = action.payload.apiStatus;
          }
          // When isLoading is undefined (e.g. streaming content chunks), leave message.isLoading
          // unchanged so the spinner stays until we explicitly pass isLoading: false at stream end.
          // Clear error state when updating message with new content
          if (message.hasError && action.payload.content !== '') {
            message.hasError = false;
            message.errorMessage = undefined;
            message.errorType = undefined;
          }
        }
      }
    },
    markMessageError: (
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        errorMessage: string;
        errorType?: 'unauthorized' | 'network' | 'general';
        apiStatus?: number;
      }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.id === action.payload.conversationId
      );
      if (conversation) {
        const message = conversation.messages.find(
          (msg) => msg.id === action.payload.messageId
        );
        if (message) {
          message.hasError = true;
          message.errorMessage = action.payload.errorMessage;
          message.errorType = action.payload.errorType;
          message.apiStatus = action.payload.apiStatus;
          message.isLoading = false;
        }
      }
    },
    removeMessagesAfter: (
      state,
      action: PayloadAction<{
        conversationId: string;
        messageIndex: number;
      }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.id === action.payload.conversationId
      );
      if (conversation) {
        conversation.messages = conversation.messages.slice(0, action.payload.messageIndex + 1);
        conversation.updatedAt = new Date();
      }
    },
    deleteConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter(
        (conv) => conv.id !== action.payload
      );
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = null;
      }
    },
    renameConversation: (
      state,
      action: PayloadAction<{ oldId: string; newId: string }>
    ) => {
      const { oldId, newId } = action.payload;
      const index = state.conversations.findIndex((conv) => conv.id === oldId);
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          id: newId,
        };
        if (state.activeConversationId === oldId) {
          state.activeConversationId = newId;
        }
        if (!state.replacedConversationIds.includes(oldId)) {
          state.replacedConversationIds.push(oldId);
        }
      }
    },
    updateConversationTitle: (
      state,
      action: PayloadAction<{ id: string; title: string }>
    ) => {
      const conversation = state.conversations.find(
        (conv) => conv.id === action.payload.id
      );
      if (conversation) {
        conversation.title = action.payload.title;
      }
    },
    toggleStarConversation: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(
        (conv) => conv.id === action.payload
      );
      if (conversation) {
        // Handle undefined starred property - default to false
        conversation.starred = !(conversation.starred ?? false);
      }
    },
    toggleArchiveConversation: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(
        (conv) => conv.id === action.payload
      );
      if (conversation) {
        // Handle undefined archived property - default to false
        conversation.archived = !(conversation.archived ?? false);
      }
    },
    archiveConversations: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(id => {
        const conversation = state.conversations.find(conv => conv.id === id);
        if (conversation) {
          conversation.archived = true;
        }
      });
    },
    unarchiveConversations: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach(id => {
        const conversation = state.conversations.find(conv => conv.id === id);
        if (conversation) {
          conversation.archived = false;
        }
      });
    },
    setStreaming: (state, action: PayloadAction<boolean>) => {
      state.isStreaming = action.payload;
    },
    clearConversations: (state) => {
      state.conversations = [];
      state.activeConversationId = null;
    },
    /** Add or update a single conversation (e.g. after fetching by ID when opening from URL). */
    upsertConversation: (state, action: PayloadAction<SerializedConversation | Conversation>) => {
      const conv = action.payload;
      const index = state.conversations.findIndex((c) => c.id === conv.id);
      const existing = index >= 0 ? state.conversations[index] : null;
      // Don't overwrite the active conversation while streaming, loading, or while it has an error message
      // (keeps spinner visible until stream completes; preserves error state so it doesn't disappear)
      if (
        existing &&
        state.activeConversationId === conv.id &&
        (state.isStreaming ||
          existing.messages.some((m) => m.isLoading === true) ||
          existing.messages.some((m) => m.hasError === true))
      ) {
        return;
      }
      const conversation: Conversation = {
        ...conv,
        starred: conv.starred ?? false,
        archived: conv.archived ?? false,
        createdAt: toDate(conv.createdAt),
        updatedAt: toDate(conv.updatedAt),
        messages: conv.messages.map((msg) => ({
          ...msg,
          content: normalizeContent(msg.content),
          timestamp: toDate(msg.timestamp),
        })),
      };
      if (index >= 0) {
        state.conversations[index] = conversation;
      } else {
        state.conversations.push(conversation);
      }
    },
    loadMockData: (state, action: PayloadAction<SerializedConversation[] | Conversation[]>) => {
      // Convert dates from strings/Date objects to Date objects for proper state management
      const loadedConversations = action.payload.map((conv) => ({
        ...conv,
        starred: conv.starred ?? false, // Ensure starred is always a boolean
        archived: conv.archived ?? false, // Ensure archived is always a boolean
        createdAt: deserializeDate(conv.createdAt),
        updatedAt: deserializeDate(conv.updatedAt),
        messages: conv.messages.map((msg) => ({
          ...msg,
          content: normalizeContent(msg.content),
          timestamp: deserializeDate(msg.timestamp),
        })),
      })) as Conversation[];

      // Preserve active conversation ID
      const currentActiveId = state.activeConversationId;

      // Merge loaded conversations with existing Redux conversations
      // This ensures newly created conversations (not yet in API) are preserved
      const conversationMap = new Map<string, Conversation>();
      const replacedSet = new Set(state.replacedConversationIds);

      // First, add loaded conversations from API (skip replaced ids so we don't show duplicate - one welcome, one chat)
      loadedConversations.forEach(conv => {
        if (!replacedSet.has(conv.id)) {
          conversationMap.set(conv.id, conv);
        }
      });

      // Then, add/update with existing Redux conversations that aren't in the loaded data
      // This preserves conversations that were just created and might not be in API yet
      state.conversations.forEach(conv => {
        if (!conversationMap.has(conv.id)) {
          // Keep the Redux version if it's not in the API response yet
          conversationMap.set(conv.id, conv);
        } else {
          // If it exists in both, merge intelligently
          const apiConv = conversationMap.get(conv.id)!;
          const reduxConv = conv;

          // Always prefer Redux starred/archived state if it differs - user action takes precedence
          // This prevents flickering when API hasn't synced the starred/archived state yet
          if (reduxConv.starred !== apiConv.starred) {
            apiConv.starred = reduxConv.starred;
          }
          if (reduxConv.archived !== apiConv.archived) {
            apiConv.archived = reduxConv.archived;
          }

          // Prefer Redux version if:
          // 1. We're currently streaming this conversation (spinner must stay until stream completes)
          // 2. Redux has more messages (newly added messages)
          // 3. Redux has a more recent updatedAt (more recent changes)
          // 4. Redux has any message with isLoading (in-progress response)
          // 5. Redux has any message with hasError (preserve error so it doesn't disappear on refetch)
          const isStreamingThisConversation =
            state.isStreaming && conv.id === currentActiveId;
          const hasLoadingMessage = reduxConv.messages.some((m) => m.isLoading === true);
          const hasErrorMessage = reduxConv.messages.some((m) => m.hasError === true);
          const shouldPreferRedux =
            isStreamingThisConversation ||
            hasLoadingMessage ||
            hasErrorMessage ||
            reduxConv.messages.length > apiConv.messages.length ||
            reduxConv.updatedAt.getTime() > apiConv.updatedAt.getTime();

          if (shouldPreferRedux) {
            conversationMap.set(conv.id, reduxConv);
          } else {
            // Use API version (with Redux starred state already synced above)
            conversationMap.set(conv.id, apiConv);
          }
        }
      });

      state.conversations = Array.from(conversationMap.values());

      // Preserve active conversation ID if it exists in the merged conversations
      const activeStillExists = currentActiveId && conversationMap.has(currentActiveId);
      if (!activeStillExists && currentActiveId) {
        // If active conversation was lost, try to keep it if it exists in Redux
        const activeInRedux = state.conversations.find(conv => conv.id === currentActiveId);
        if (!activeInRedux) {
          state.activeConversationId = null;
        }
      }
    },
  },
});

// Export actions individually to help with Turbopack
export const createConversation = chatSlice.actions.createConversation;
export const setActiveConversation = chatSlice.actions.setActiveConversation;
export const addMessage = chatSlice.actions.addMessage;
export const updateMessage = chatSlice.actions.updateMessage;
export const markMessageError = chatSlice.actions.markMessageError;
export const removeMessagesAfter = chatSlice.actions.removeMessagesAfter;
export const deleteConversation = chatSlice.actions.deleteConversation;
export const renameConversation = chatSlice.actions.renameConversation;
export const updateConversationTitle = chatSlice.actions.updateConversationTitle;
export const toggleStarConversation = chatSlice.actions.toggleStarConversation;
export const toggleArchiveConversation = chatSlice.actions.toggleArchiveConversation;
export const archiveConversations = chatSlice.actions.archiveConversations;
export const unarchiveConversations = chatSlice.actions.unarchiveConversations;
export const setStreaming = chatSlice.actions.setStreaming;
export const clearConversations = chatSlice.actions.clearConversations;
export const upsertConversation = chatSlice.actions.upsertConversation;
export const loadMockData = chatSlice.actions.loadMockData;

export default chatSlice.reducer;

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector, useAppStore } from '@/store/hooks';
import { chatApi, conversationsApi } from '@/lib/api';
import {
  addMessage,
  createConversation,
  renameConversation,
  setStreaming,
  updateMessage,
  markMessageError,
  removeMessagesAfter,
} from '@/store/slices/chatSlice';
import { generateConversationId, generateMessageId, isUUID } from '@/lib/utils/id';
import { CONSTANTS } from '@/lib/utils/constants';
import { serializeDate, deserializeDate } from '@/lib/utils/date';
import type { Message, ChatRequest, FileAttachment, PinnedItem, Conversation } from '@/types';
import { useCallback, useRef } from 'react';

/** Throttle interval for streaming UI updates (ms). Lower = smoother typing animation. */
const STREAM_THROTTLE_MS = 16;

export const useChat = (options?: { isProRef?: React.MutableRefObject<boolean> }) => {
  const isProRef = options?.isProRef;
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { conversations, activeConversationId, isStreaming } = useAppSelector(
    (state) => state.chat
  );

  const activeConversation = conversations.find(
    (conv) => conv.id === activeConversationId
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (request: ChatRequest) => {
      return chatApi.sendMessage(request);
    },
    onSuccess: () => {
      // Handle success - message is already added via streaming or direct response
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
    },
  });

  const sendMessage = useCallback(
    async (content: string, attachments?: FileAttachment[], pinnedItems?: PinnedItem[], isPro?: boolean) => {
      let conversationId: string;

      if (!activeConversationId) {
        const title = content.slice(0, CONSTANTS.MAX_CONVERSATION_TITLE_LENGTH) || CONSTANTS.DEFAULT_CONVERSATION_TITLE;

        try {
          const apiConversation = await conversationsApi.create(title);
          conversationId = apiConversation.id;

          const newConversation = {
            id: apiConversation.id,
            title: apiConversation.title,
            starred: apiConversation.starred ?? false,
            messages: [],
            createdAt: serializeDate(deserializeDate(apiConversation.createdAt)),
            updatedAt: serializeDate(deserializeDate(apiConversation.updatedAt)),
          };
          dispatch(createConversation(newConversation));

          const chatPath = `/chat/${apiConversation.id}`;
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `${window.location.origin}${chatPath}`);
          }
          routerRef.current.replace(chatPath);
        } catch (error) {
          console.error('Failed to create conversation via API:', error);
          conversationId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : generateConversationId();
          const newConversation = {
            id: conversationId,
            title: title,
            starred: false,
            messages: [],
            createdAt: serializeDate(new Date()),
            updatedAt: serializeDate(new Date()),
          };
          dispatch(createConversation(newConversation));

          const chatPath = `/chat/${conversationId}`;
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `${window.location.origin}${chatPath}`);
          }
          routerRef.current.replace(chatPath);
        }
      } else {
        conversationId = activeConversationId;
      }

      // Add user message and assistant placeholder (spinner) BEFORE navigating so chat panel shows at /chat
      const userMessage: Message = {
        id: generateMessageId('user'),
        role: 'user',
        content,
        timestamp: new Date(),
        attachments: attachments,
        pinnedItems: pinnedItems,
      };

      dispatch(
        addMessage({
          conversationId,
          message: userMessage,
        })
      );

      const assistantMessageId = generateMessageId('assistant');
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
        // is_pro comes from API response, not input toggle; no Pro styling during loading
      };

      dispatch(
        addMessage({
          conversationId,
          message: assistantMessage,
        })
      );

      // Live chat: show response from Chat API stream (spinner + auto-type). Server stores user + model events in events table.
      // On refresh or open other conversation: UI loads from events table via GET /api/conversations/:id (no typing, formatted).

      // Let the UI paint the spinner (and chat view) before starting the stream — otherwise the first
      // message can appear in one go because React hasn't rendered the spinner yet when chunks arrive.
      // Use a minimum delay so the spinner is visible even when the API fails instantly (e.g. 403).
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (typeof requestAnimationFrame !== 'undefined') {
        await new Promise<void>((r) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => r());
          });
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure spinner is visible before fetch (helps when API fails instantly)

      // Stream response
      dispatch(setStreaming(true));
      let receivedSessionId: string | null = null;
      let hadError = false;
      try {
        // Build message for backend - include pinned items context if any
        let backendMessage = content;
        if (pinnedItems && pinnedItems.length > 0) {
          const pinnedContext = pinnedItems.map(item =>
            `[Pinned ${item.type}: ${item.content}]`
          ).join('\n');
          backendMessage = pinnedContext + (content ? '\n\n' + content : '');
        }

        const isFirstMessage = !activeConversationId || (activeConversation?.messages?.length ?? 0) === 0;
        const request: ChatRequest = {
          message: backendMessage,
          conversationId: conversationId,
          history: activeConversation?.messages || [],
          ...(isFirstMessage && { title: content.trim().slice(0, CONSTANTS.MAX_CONVERSATION_TITLE_LENGTH) || CONSTANTS.DEFAULT_CONVERSATION_TITLE }),
          is_pro: isPro ?? false,
        };

        let fullResponse = '';
        let currentConversationId = conversationId;

        const applySessionIdToUrl = (sessionId: string) => {
          if (typeof window === 'undefined') return;
          // Only update URL if user is still viewing this conversation - don't redirect if they've navigated away
          const currentPath = window.location.pathname;
          const pathId = currentPath?.startsWith('/chat/') ? currentPath.split('/chat/')[1]?.split('/')[0] : null;
          const isViewingThisConversation = pathId === conversationId || pathId === sessionId || pathId === currentConversationId;
          if (!isViewingThisConversation) return; // User navigated away (e.g. to another tab or new chat), don't redirect
          const newPath = `/chat/${sessionId}`;
          const fullUrl = `${window.location.origin}${newPath}`;
          const doReplace = () => {
            window.history.replaceState(null, '', fullUrl);
            routerRef.current.replace(newPath);
          };
          doReplace();
          requestAnimationFrame(() => { doReplace(); requestAnimationFrame(doReplace); });
          setTimeout(doReplace, 50);
        };

        let lastDispatchTime = 0;
        let responseIsPro = false; // From API response, not input toggle
        for await (const chunk of chatApi.streamMessage(request)) {
          if (typeof chunk === 'object' && chunk !== null) {
            const meta = chunk as { sessionId?: string; is_pro?: boolean; eventId?: string };
            if (meta.sessionId && isUUID(meta.sessionId)) {
              receivedSessionId = meta.sessionId;
              if (meta.sessionId !== currentConversationId) {
                dispatch(renameConversation({ oldId: currentConversationId, newId: meta.sessionId }));
                currentConversationId = meta.sessionId;
              }
              applySessionIdToUrl(meta.sessionId);
            }
            if (meta.is_pro !== undefined) {
              responseIsPro = meta.is_pro === true;
            }
            if (meta.eventId && typeof meta.eventId === 'string') {
              dispatch(
                updateMessage({
                  conversationId: currentConversationId,
                  messageId: assistantMessageId,
                  content: fullResponse,
                  eventId: meta.eventId,
                })
              );
            }
            if ('sessionId' in meta || 'is_pro' in meta || 'eventId' in meta) continue; // Skip metadata, don't add to content
          }
          const contentChunk = typeof chunk === 'string' ? chunk : '';
          fullResponse += contentChunk;
          const now = Date.now();
          if (now - lastDispatchTime >= STREAM_THROTTLE_MS) {
            dispatch(
              updateMessage({
                conversationId: currentConversationId,
                messageId: assistantMessageId,
                content: fullResponse,
              })
            );
            lastDispatchTime = now;
            // Yield to allow React to paint before processing next chunk
            await new Promise((resolve) => setTimeout(resolve, STREAM_THROTTLE_MS));
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Final update: full content + clear spinner; is_pro from API response, not input toggle
        dispatch(
          updateMessage({
            conversationId: currentConversationId,
            messageId: assistantMessageId,
            content: fullResponse,
            isLoading: false,
            is_pro: responseIsPro,
            apiStatus: 200,
          })
        );

        if (receivedSessionId && isUUID(receivedSessionId)) {
          applySessionIdToUrl(receivedSessionId);
        }
      } catch (error) {
        hadError = true;
        // Log full error for debugging intermittent failures (server succeeds but client shows error)
        console.error('Error streaming message:', error);
        if (error instanceof Error) {
          console.error('[useChat] Error details – name:', error.name, '| message:', error.message, '| stack:', error.stack);
        } else {
          console.error('[useChat] Non-Error thrown:', String(error), typeof error);
        }

        // Detect error type
        let errorType: 'unauthorized' | 'network' | 'general' = 'general';
        let errorMessage: string = CONSTANTS.ERROR_MESSAGES.STREAMING_ERROR;

        if (error instanceof Error) {
          errorMessage = error.message;

          // Check for unauthorized errors (401) - check status code first
          const errorWithStatus = error as Error & { status?: number };
          if (errorWithStatus.status === 401 ||
            error.message.includes('401') ||
            error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('not authenticated') ||
            error.message.toLowerCase().includes('session token')) {
            errorType = 'unauthorized';
            errorMessage = 'Your session has expired. Please try logging in again.';
          }
          // Check for network errors - status 0 indicates network error
          else if (errorWithStatus.status === 0 ||
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('fetch') ||
            error.message.toLowerCase().includes('connection') ||
            error.message.toLowerCase().includes('failed to fetch') ||
            error.name === 'TypeError' && error.message.includes('fetch')) {
            errorType = 'network';
            errorMessage = 'Network connection error. Please check your internet connection and try again.';
          }
        }

        dispatch(
          updateMessage({
            conversationId,
            messageId: assistantMessageId,
            content: errorMessage,
            isLoading: false,
          })
        );
        const errorStatus = (error as Error & { status?: number }).status;
        dispatch(
          markMessageError({
            conversationId,
            messageId: assistantMessageId,
            errorMessage,
            errorType,
            apiStatus: errorStatus,
          })
        );
      } finally {
        dispatch(setStreaming(false));
        // Don't invalidate on error — refetches would overwrite Redux and hide the error + user message
        if (!hadError) {
          if (!receivedSessionId) queryClient.invalidateQueries({ queryKey: ['conversations'] });
          // Don't invalidate single conversation — refetch would overwrite Redux and hide is_pro styling.
          // Pro state is persisted in DB; next open/refresh loads it from getEvents.
        }
      }
    },
    [activeConversationId, activeConversation, dispatch, queryClient]
  );

  const retryMessage = useCallback(
    async (assistantMessageId: string) => {
      const conversation = activeConversation;
      if (!conversation || !activeConversationId) return;

      // Find the assistant message with error
      const assistantMessageIndex = conversation.messages.findIndex(
        (msg) => msg.id === assistantMessageId && msg.role === 'assistant'
      );

      if (assistantMessageIndex === -1) return;

      // Find the previous user message
      const userMessageIndex = assistantMessageIndex - 1;
      if (userMessageIndex < 0 || conversation.messages[userMessageIndex].role !== 'user') {
        return;
      }

      const userMessage = conversation.messages[userMessageIndex];

      // Clear error state and set loading on the assistant message
      // Setting isLoading to true will automatically clear error state in the reducer
      dispatch(
        updateMessage({
          conversationId: activeConversationId,
          messageId: assistantMessageId,
          content: '',
          isLoading: true,
        })
      );

      // Stream response directly without resending user message
      dispatch(setStreaming(true));
      try {
        // Build message for backend - include pinned items context if any
        let backendMessage = userMessage.content;
        if (userMessage.pinnedItems && userMessage.pinnedItems.length > 0) {
          const pinnedContext = userMessage.pinnedItems.map(item =>
            `[Pinned ${item.type}: ${item.content}]`
          ).join('\n');
          backendMessage = pinnedContext + (userMessage.content ? '\n\n' + userMessage.content : '');
        }

        // Build history up to (but not including) the failed assistant message
        const history = conversation.messages.slice(0, userMessageIndex);

        const request: ChatRequest = {
          message: backendMessage,
          conversationId: activeConversationId,
          history: history,
          is_pro: isProRef?.current ?? false,
          isRetry: true, // Don't insert duplicate user event - message already exists
        };

        let fullResponse = '';
        let lastDispatchTime = 0;
        let responseIsPro = false;
        for await (const chunk of chatApi.streamMessage(request)) {
          if (typeof chunk === 'object' && chunk !== null) {
            const meta = chunk as { sessionId?: string; is_pro?: boolean; eventId?: string };
            if (meta.is_pro !== undefined) responseIsPro = meta.is_pro === true;
            if (meta.eventId && typeof meta.eventId === 'string') {
              dispatch(
                updateMessage({
                  conversationId: activeConversationId,
                  messageId: assistantMessageId,
                  content: fullResponse,
                  eventId: meta.eventId,
                })
              );
            }
            if ('sessionId' in meta || 'is_pro' in meta || 'eventId' in meta) continue;
          }
          const contentChunk = typeof chunk === 'string' ? chunk : '';
          fullResponse += contentChunk;
          const now = Date.now();
          if (now - lastDispatchTime >= STREAM_THROTTLE_MS) {
            dispatch(
              updateMessage({
                conversationId: activeConversationId,
                messageId: assistantMessageId,
                content: fullResponse,
              })
            );
            lastDispatchTime = now;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Mark as complete: full content + clear spinner; is_pro from API response
        dispatch(
          updateMessage({
            conversationId: activeConversationId,
            messageId: assistantMessageId,
            content: fullResponse,
            isLoading: false,
            is_pro: responseIsPro,
            apiStatus: 200,
          })
        );
      } catch (error) {
        console.error('Error retrying message:', error);

        // Detect error type
        let errorType: 'unauthorized' | 'network' | 'general' = 'general';
        let errorMessage: string = CONSTANTS.ERROR_MESSAGES.STREAMING_ERROR;

        if (error instanceof Error) {
          errorMessage = error.message;

          // Check for unauthorized errors (401) - check status code first
          const errorWithStatus = error as Error & { status?: number };
          if (errorWithStatus.status === 401 ||
            error.message.includes('401') ||
            error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('not authenticated') ||
            error.message.toLowerCase().includes('session token')) {
            errorType = 'unauthorized';
            errorMessage = 'Your session has expired. Please try logging in again.';
          }
          // Check for network errors - status 0 indicates network error
          else if (errorWithStatus.status === 0 ||
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('fetch') ||
            error.message.toLowerCase().includes('connection') ||
            error.message.toLowerCase().includes('failed to fetch') ||
            error.name === 'TypeError' && error.message.includes('fetch')) {
            errorType = 'network';
            errorMessage = 'Network connection error. Please check your internet connection and try again.';
          }
        }

        dispatch(
          updateMessage({
            conversationId: activeConversationId,
            messageId: assistantMessageId,
            content: errorMessage,
            isLoading: false,
          })
        );
        const errorStatus = (error as Error & { status?: number }).status;
        dispatch(
          markMessageError({
            conversationId: activeConversationId,
            messageId: assistantMessageId,
            errorMessage,
            errorType,
            apiStatus: errorStatus,
          })
        );
      } finally {
        dispatch(setStreaming(false));
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        // Don't invalidate single conversation — preserves is_pro in Redux; DB has it for next load
      }
    },
    [activeConversation, activeConversationId, dispatch, isProRef, queryClient]
  );

  const regenerateResponse = useCallback(
    async (userMessageId: string, userContent: string, attachments?: FileAttachment[], pinnedItems?: PinnedItem[]) => {
      if (!activeConversationId) return;

      // Get fresh conversation state from Redux store
      const state = store.getState();
      const currentConversation = state.chat.conversations.find(
        (conv: Conversation) => conv.id === activeConversationId
      );

      if (!currentConversation) return;

      // Find the user message index
      const userMessageIndex = currentConversation.messages.findIndex(
        (msg) => msg.id === userMessageId && msg.role === 'user'
      );

      if (userMessageIndex === -1) return;

      // Remove all messages after the user message (including the assistant response if it exists) FIRST
      dispatch(
        removeMessagesAfter({
          conversationId: activeConversationId,
          messageIndex: userMessageIndex,
        })
      );

      // Update the user message content after removing messages
      if (userContent !== currentConversation.messages[userMessageIndex].content) {
        dispatch(
          updateMessage({
            conversationId: activeConversationId,
            messageId: userMessageId,
            content: userContent,
          })
        );
      }

      // Add or update assistant message placeholder
      // After removeMessagesAfter, we need to create a new assistant message
      const assistantMessageId = generateMessageId('assistant');
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
        // is_pro from API response, not input toggle
      };
      dispatch(
        addMessage({
          conversationId: activeConversationId,
          message: assistantMessage,
        })
      );

      // Stream response
      dispatch(setStreaming(true));
      try {
        // Build message for backend - include pinned items context if any
        let backendMessage = userContent;
        if (pinnedItems && pinnedItems.length > 0) {
          const pinnedContext = pinnedItems.map(item =>
            `[Pinned ${item.type}: ${item.content}]`
          ).join('\n');
          backendMessage = pinnedContext + (userContent ? '\n\n' + userContent : '');
        }

        // Build history with updated user message content
        const history = currentConversation.messages.slice(0, userMessageIndex).map(msg => {
          if (msg.id === userMessageId) {
            return { ...msg, content: userContent };
          }
          return msg;
        });
        // Add the updated user message
        const updatedUserMessage = { ...currentConversation.messages[userMessageIndex], content: userContent };
        history.push(updatedUserMessage);

        const request: ChatRequest = {
          message: backendMessage,
          conversationId: activeConversationId,
          history: history,
          is_pro: isProRef?.current ?? false,
          isRetry: true, // Don't insert duplicate user event - message already exists
        };

        let fullResponse = '';
        let lastDispatchTime = 0;
        let responseIsPro = false;
        for await (const chunk of chatApi.streamMessage(request)) {
          if (typeof chunk === 'object' && chunk !== null) {
            const meta = chunk as { sessionId?: string; is_pro?: boolean; eventId?: string };
            if (meta.is_pro !== undefined) responseIsPro = meta.is_pro === true;
            if (meta.eventId && typeof meta.eventId === 'string') {
              dispatch(
                updateMessage({
                  conversationId: activeConversationId,
                  messageId: assistantMessageId,
                  content: fullResponse,
                  eventId: meta.eventId,
                })
              );
            }
            if ('sessionId' in meta || 'is_pro' in meta || 'eventId' in meta) continue;
          }
          const contentChunk = typeof chunk === 'string' ? chunk : '';
          fullResponse += contentChunk;
          const now = Date.now();
          if (now - lastDispatchTime >= STREAM_THROTTLE_MS) {
            dispatch(
              updateMessage({
                conversationId: activeConversationId,
                messageId: assistantMessageId,
                content: fullResponse,
              })
            );
            lastDispatchTime = now;
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Mark as complete: full content + clear spinner; is_pro from API response
        dispatch(
          updateMessage({
            conversationId: activeConversationId,
            messageId: assistantMessageId,
            content: fullResponse,
            isLoading: false,
            is_pro: responseIsPro,
            apiStatus: 200,
          })
        );
      } catch (error) {
        console.error('Error streaming message:', error);

        // Detect error type
        let errorType: 'unauthorized' | 'network' | 'general' = 'general';
        let errorMessage: string = CONSTANTS.ERROR_MESSAGES.STREAMING_ERROR;

        if (error instanceof Error) {
          errorMessage = error.message;

          // Check for unauthorized errors (401) - check status code first
          const errorWithStatus = error as Error & { status?: number };
          if (errorWithStatus.status === 401 ||
            error.message.includes('401') ||
            error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('not authenticated') ||
            error.message.toLowerCase().includes('session token')) {
            errorType = 'unauthorized';
            errorMessage = 'Your session has expired. Please try logging in again.';
          }
          // Check for network errors - status 0 indicates network error
          else if (errorWithStatus.status === 0 ||
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('fetch') ||
            error.message.toLowerCase().includes('connection') ||
            error.message.toLowerCase().includes('failed to fetch') ||
            error.name === 'TypeError' && error.message.includes('fetch')) {
            errorType = 'network';
            errorMessage = 'Network connection error. Please check your internet connection and try again.';
          }
        }

        dispatch(
          updateMessage({
            conversationId: activeConversationId,
            messageId: assistantMessageId,
            content: errorMessage,
            isLoading: false,
          })
        );
        const errorStatus = (error as Error & { status?: number }).status;
        dispatch(
          markMessageError({
            conversationId: activeConversationId,
            messageId: assistantMessageId,
            errorMessage,
            errorType,
            apiStatus: errorStatus,
          })
        );
      } finally {
        dispatch(setStreaming(false));
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        // Don't invalidate single conversation — preserves is_pro in Redux; DB has it for next load
      }
    },
    [activeConversationId, store, dispatch, isProRef, queryClient]
  );

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isStreaming,
    sendMessage,
    retryMessage,
    regenerateResponse,
    isLoading: sendMessageMutation.isPending,
  };
};


'use client';

import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector, useAppStore } from '@/store/hooks';
import { useChat } from './useChat';
import { useClipboard } from './useClipboard';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { usePinnedItems } from './usePinnedItems';
import { reactionsApi } from '@/lib/api';
import { addPinnedItem, removePinnedItemByMessageId, removePinnedItem } from '@/store/slices/pinnedSlice';
import { generateId } from '@/lib/utils/id';
import { serializeDate } from '@/lib/utils/date';
import { exportChatAsPDF } from '@/lib/utils/exportChatAsPDF';
import { addToast, removeToast } from '@/store/slices/uiSlice';
import { extractCopyText } from '@/lib/utils/textExtraction';
import type { Message } from '@/types';

interface UseMessageHandlersOptions {
  message: Message;
  onShareModalOpen?: (messageId: string) => void;
  onCopyModalOpen?: (messageId: string) => void;
  onTableChartShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onTableChartCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onTableChartPin?: (content: string, title?: string, type?: 'table' | 'chart' | 'text', messageId?: string) => void;
}

function findPinnedItemByContent(
  pinnedItems: Array<{ id: string; content: unknown }>,
  rawContent: string
) {
  const normalized = typeof rawContent === 'string' ? rawContent : String(rawContent || '');
  return pinnedItems.find((item) => {
    const itemContent = typeof item.content === 'string' ? item.content : String(item.content || '');
    return itemContent.trim() === normalized.trim();
  });
}

function getChartTitle(chartData: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(chartData);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as { type?: unknown }).type === 'chart' &&
      typeof (parsed as { title?: unknown }).title === 'string'
    ) {
      return (parsed as { title: string }).title;
    }
  } catch {
    // If parsing fails, return undefined.
  }
  return undefined;
}

interface UseMessageHandlersReturn {
  // State
  isEditing: boolean;
  editedContent: string;
  isExpanded: boolean;
  needsTruncation: boolean;
  isFlagged: boolean;
  isDisliked: boolean;
  isDeepDiveActive: boolean;
  isPinned: boolean;
  copied: boolean;
  isSpeaking: boolean;

  // Handlers
  handleRetry: () => void;
  handleEdit: () => void;
  handleSaveEdit: () => Promise<void>;
  handleCancelEdit: () => void;
  handleRegenerate: () => void;
  handleCopy: () => Promise<void>;
  handleShare: () => void;
  handleReportIssue: () => void;
  handleDislike: () => void;
  handleDeepDive: () => void;
  handleReadAloud: () => void;
  handlePin: () => void;
  handleTableCopy: (type: 'table' | 'chart', content: string, title?: string) => void;
  handleTablePin: (tableData: string) => void;
  handleTableUnpin: (tableData: string) => void;
  handleTableShare: (type: 'table' | 'chart', content: string, title?: string) => void;
  handleChartCopy: (type: 'table' | 'chart', content: string, title?: string) => void;
  handleChartPin: (chartData: string) => void;
  handleChartUnpin: (chartData: string) => void;
  handleChartShare: (type: 'table' | 'chart', content: string, title?: string) => void;
  setEditedContent: (content: string) => void;
  setIsExpanded: (expanded: boolean) => void;
  setNeedsTruncation: (needs: boolean) => void;
}

/**
 * Custom hook that consolidates all message-related handlers and state
 * Reduces complexity in ChatMessage component
 */
export function useMessageHandlers(
  options: UseMessageHandlersOptions
): UseMessageHandlersReturn {
  const { message, onShareModalOpen, onCopyModalOpen, onTableChartShare, onTableChartCopy, onTableChartPin } = options;
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { retryMessage, regenerateResponse, activeConversation } = useChat();
  const { activeConversationId, conversations } = useAppSelector((state) => state.chat);
  const pinnedItems = useAppSelector((state) => state.pinned.items);
  const { copy: copyToClipboard, copied } = useClipboard();
  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis();
  const { deletePinnedItem } = usePinnedItems();

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const [optimisticReactions, setOptimisticReactions] = useState<
    Record<string, { isFlagged: boolean; isDisliked: boolean }>
  >({});
  const [isDeepDiveActive, setIsDeepDiveActive] = useState(false);

  const displayedReactions = optimisticReactions[message.id] ?? {
    isFlagged: message.isFlagged ?? false,
    isDisliked: message.isDisliked ?? false,
  };

  const isFlagged = displayedReactions.isFlagged;
  const isDisliked = displayedReactions.isDisliked;

  // Sync isPinned with store
  const isPinned = message.id
    ? pinnedItems.some((item) => item.messageId === message.id)
    : false;

  const handleRetry = useCallback(() => {
    if (message.role === 'assistant' && message.id) {
      retryMessage(message.id);
    }
  }, [message, retryMessage]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditedContent(message.content);
  }, [message.content]);

  const handleSaveEdit = useCallback(async () => {
    if (activeConversationId && message.id) {
      const trimmedContent = editedContent.trim();
      setIsEditing(false);

      if (message.role === 'user' && trimmedContent) {
        try {
          await regenerateResponse(
            message.id,
            trimmedContent,
            message.attachments,
            message.pinnedItems
          );
        } catch (error) {
          console.error('Error regenerating response:', error);
        }
      }
    }
  }, [activeConversationId, message, editedContent, regenerateResponse]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedContent(message.content);
  }, [message.content]);

  const handleRegenerate = useCallback(() => {
    if (message.role === 'user' && message.content && message.id) {
      regenerateResponse(message.id, message.content, message.attachments, message.pinnedItems);
    } else if (message.role === 'assistant' && message.id && activeConversationId) {
      const currentConversation = conversations.find((conv) => conv.id === activeConversationId);

      if (currentConversation) {
        const assistantIndex = currentConversation.messages.findIndex(
          (msg) => msg.id === message.id && msg.role === 'assistant'
        );

        if (assistantIndex > 0) {
          let userMessageIndex = -1;
          for (let i = assistantIndex - 1; i >= 0; i--) {
            if (currentConversation.messages[i].role === 'user') {
              userMessageIndex = i;
              break;
            }
          }

          if (userMessageIndex !== -1) {
            const userMessage = currentConversation.messages[userMessageIndex];
            regenerateResponse(
              userMessage.id,
              userMessage.content,
              userMessage.attachments,
              userMessage.pinnedItems
            );
          }
        }
      }
    }
  }, [message, activeConversationId, conversations, regenerateResponse]);

  const handleCopy = useCallback(async () => {
    if (onCopyModalOpen) {
      onCopyModalOpen(message.id);
    } else {
      // Fallback to direct copy if modal callback not provided
      const plainText = extractCopyText(message.content);
      await copyToClipboard(plainText);
    }
  }, [message.id, message.content, copyToClipboard, onCopyModalOpen]);

  const handleShare = useCallback(async () => {
    if (onShareModalOpen) {
      onShareModalOpen(message.id);
    } else if (activeConversation) {
      const generatingMessage = 'Generating PDF...';
      dispatch(
        addToast({
          message: generatingMessage,
          type: 'info',
          duration: 0,
        })
      );
      const generatingToastId = store
        .getState()
        .ui.toasts.find((t) => t.message === generatingMessage && t.type === 'info')?.id;
      try {
        await exportChatAsPDF(activeConversation.title || 'chat');
      } finally {
        if (generatingToastId) {
          dispatch(removeToast(generatingToastId));
        }
      }
    }
  }, [activeConversation, dispatch, onShareModalOpen, message.id, store]);

  const handleReportIssue = useCallback(async () => {
    const targetEventId = message.eventId ?? message.id;
    const prevFlagged = isFlagged;
    const prevDisliked = isDisliked;

    // Optimistic UI update
    setOptimisticReactions((prev) => ({
      ...prev,
      [message.id]: {
        isFlagged: !prevFlagged,
        isDisliked: prevDisliked,
      },
    }));

    try {
      const res = await reactionsApi.toggle({ eventId: targetEventId, action: 'flag' });
      setOptimisticReactions((prev) => ({
        ...prev,
        [message.id]: {
          isFlagged: res.isFlagged,
          isDisliked: res.isDisliked,
        },
      }));
    } catch (error) {
      console.error('Failed to toggle report issue:', error);
      setOptimisticReactions((prev) => ({
        ...prev,
        [message.id]: {
          isFlagged: prevFlagged,
          isDisliked: prevDisliked,
        },
      }));
    }
  }, [message.eventId, message.id, isFlagged, isDisliked]);

  const handleDislike = useCallback(async () => {
    const targetEventId = message.eventId ?? message.id;
    const prevFlagged = isFlagged;
    const prevDisliked = isDisliked;

    // Optimistic UI update
    setOptimisticReactions((prev) => ({
      ...prev,
      [message.id]: {
        isFlagged: prevFlagged,
        isDisliked: !prevDisliked,
      },
    }));

    try {
      const res = await reactionsApi.toggle({ eventId: targetEventId, action: 'dislike' });
      setOptimisticReactions((prev) => ({
        ...prev,
        [message.id]: {
          isFlagged: res.isFlagged,
          isDisliked: res.isDisliked,
        },
      }));
    } catch (error) {
      console.error('Failed to toggle dislike:', error);
      setOptimisticReactions((prev) => ({
        ...prev,
        [message.id]: {
          isFlagged: prevFlagged,
          isDisliked: prevDisliked,
        },
      }));
    }
  }, [message.eventId, message.id, isFlagged, isDisliked]);

  const handleDeepDive = useCallback(() => {
    setIsDeepDiveActive(!isDeepDiveActive);
  }, [isDeepDiveActive]);

  const handleReadAloud = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (message.role === 'assistant' && message.content) {
      speak(message.content);
    }
  }, [isSpeaking, message, speak, stopSpeaking]);

  const handlePin = useCallback(() => {
    if (message.id && message.role === 'assistant') {
      if (isPinned) {
        // Find the pinned item by messageId
        const pinnedItem = pinnedItems.find((item) => item.messageId === message.id);
        if (pinnedItem) {
          // Delete via API (which will also update Redux via mutation onSuccess)
          deletePinnedItem(pinnedItem.id, {
            onSuccess: () => {
              // Redux will be updated automatically by the mutation's onSuccess
            },
            onError: (error) => {
              // If API call fails, still remove from Redux to keep UI in sync
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (errorMessage.includes('not found') || errorMessage.includes('404')) {
                // Item already deleted or doesn't exist - just remove from Redux state
                dispatch(removePinnedItem(pinnedItem.id));
              } else {
                // For other errors, log but still remove from Redux to keep UI in sync
                console.error('Failed to delete pinned item:', error);
                dispatch(removePinnedItem(pinnedItem.id));
              }
            },
          });
        } else {
          // Fallback: if item not found in Redux, try removing by messageId
          dispatch(removePinnedItemByMessageId(message.id));
        }
      } else {
        // Open pin modal instead of directly pinning
        if (onTableChartPin) {
          onTableChartPin(message.content, undefined, 'text', message.id);
        } else if (activeConversationId) {
          // Fallback to direct pinning if modal handler not provided
          const pinnedItem = {
            id: generateId('pinned'),
            messageId: message.id,
            conversationId: activeConversationId,
            content: message.content,
            pinnedAt: serializeDate(new Date()),
            type: 'response' as const,
          };
          dispatch(addPinnedItem(pinnedItem));
        }
      }
    }
  }, [message, isPinned, activeConversationId, dispatch, onTableChartPin, pinnedItems, deletePinnedItem]);

  const handleTableCopy = useCallback((type: 'table' | 'chart', content: string, title?: string) => {
    if (onTableChartCopy) {
      onTableChartCopy(type, content, title);
    } else {
      // Fallback to direct copy
      copyToClipboard(content);
    }
  }, [copyToClipboard, onTableChartCopy]);

  const handleTablePin = useCallback(
    (tableData: string) => {
      if (onTableChartPin) {
        // Open pin modal instead of directly pinning
        onTableChartPin(tableData, undefined, 'table');
      } else if (activeConversationId) {
        // Fallback to direct pinning if modal handler not provided
        const pinnedItem = {
          id: generateId('pinned'),
          messageId: generateId('table'),
          conversationId: activeConversationId,
          content: tableData,
          pinnedAt: serializeDate(new Date()),
          type: 'response' as const,
        };
        dispatch(addPinnedItem(pinnedItem));
      }
    },
    [activeConversationId, dispatch, onTableChartPin]
  );

  const handleTableUnpin = useCallback(
    (tableData: string) => {
      const pinnedItem = findPinnedItemByContent(pinnedItems, tableData);
      if (pinnedItem) {
        deletePinnedItem(pinnedItem.id, {
          onError: () => {
            // If API fails, still remove from Redux to keep UI in sync
            dispatch(removePinnedItem(pinnedItem.id));
          },
        });
      }
    },
    [pinnedItems, dispatch, deletePinnedItem]
  );

  const handleTableShare = useCallback((type: 'table' | 'chart', content: string, title?: string) => {
    if (onTableChartShare) {
      onTableChartShare(type, content, title);
    }
  }, [onTableChartShare]);

  const handleChartCopy = useCallback((type: 'table' | 'chart', content: string, title?: string) => {
    if (onTableChartCopy) {
      onTableChartCopy(type, content, title);
    } else {
      // Fallback to direct copy
      copyToClipboard(content);
    }
  }, [copyToClipboard, onTableChartCopy]);

  const handleChartPin = useCallback(
    (chartData: string) => {
      if (onTableChartPin) {
        const title = getChartTitle(chartData);
        // Open pin modal instead of directly pinning
        onTableChartPin(chartData, title, 'chart');
      } else if (activeConversationId) {
        // Fallback to direct pinning if modal handler not provided
        const title = getChartTitle(chartData);

        const pinnedItem = {
          id: generateId('pinned'),
          messageId: generateId('chart'),
          conversationId: activeConversationId,
          content: chartData,
          title,
          pinnedAt: serializeDate(new Date()),
          type: 'response' as const,
        };
        dispatch(addPinnedItem(pinnedItem));
      }
    },
    [activeConversationId, dispatch, onTableChartPin]
  );

  const handleChartUnpin = useCallback(
    (chartData: string) => {
      const pinnedItem = findPinnedItemByContent(pinnedItems, chartData);
      if (pinnedItem) {
        deletePinnedItem(pinnedItem.id, {
          onError: () => {
            // If API fails, still remove from Redux to keep UI in sync
            dispatch(removePinnedItem(pinnedItem.id));
          },
        });
      }
    },
    [pinnedItems, dispatch, deletePinnedItem]
  );

  const handleChartShare = useCallback((type: 'table' | 'chart', content: string, title?: string) => {
    if (onTableChartShare) {
      onTableChartShare(type, content, title);
    }
  }, [onTableChartShare]);

  return {
    // State
    isEditing,
    editedContent,
    isExpanded,
    needsTruncation,
    isFlagged,
    isDisliked,
    isDeepDiveActive,
    isPinned,
    copied,
    isSpeaking,

    // Handlers
    handleRetry,
    handleEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleRegenerate,
    handleCopy,
    handleShare,
    handleReportIssue,
    handleDislike,
    handleDeepDive,
    handleReadAloud,
    handlePin,
    handleTableCopy,
    handleTablePin,
    handleTableUnpin,
    handleTableShare,
    handleChartCopy,
    handleChartPin,
    handleChartUnpin,
    handleChartShare,
    setEditedContent,
    setIsExpanded,
    setNeedsTruncation,
  };
}


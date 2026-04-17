'use client';

import { useEffect, useRef, memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Message, PinnedItem } from '@/types';
import { useChat } from '@/hooks/useChat';
import { useAppSelector } from '@/store/hooks';
import { useMessageHandlers } from '@/hooks/useMessageHandlers';
import { useChatActions } from '@/contexts/ChatActionsContext';
import { UserMessage, AssistantMessage } from './message';
import { formatMessageContentForDisplay } from '@/lib/utils/formatMessageContent';

/**
 * Normalize message content to string and format for display.
 * If content is raw event JSON (e.g. {"role":"user","parts":[{"text":"how are you"}]}),
 * parse and return formatted text for UI. Otherwise return content as-is (text, markdown, charts, tables).
 */
function getMessageContent(content: unknown): string {
  if (content == null) return '';
  if (typeof content !== 'string') return typeof content === 'object' ? JSON.stringify(content) : String(content);
  return formatMessageContentForDisplay(content);
}

/**
 * When a user message is sent with pinned items, backend context can be prepended as:
 * [Pinned <type>: <content>]
 * Strip that prefix for UI display so the user message remains clean.
 */
function stripPinnedContextPrefix(content: string): string {
  const s = content.trimStart();
  if (!s.startsWith('[Pinned ')) return content;

  let i = 0;
  const len = s.length;
  let consumedAnyPinnedBlock = false;

  const skipWhitespace = () => {
    while (i < len && /\s/.test(s[i])) i++;
  };

  while (i < len) {
    skipWhitespace();
    if (!s.startsWith('[Pinned ', i)) break;

    consumedAnyPinnedBlock = true;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let foundEnd = false;

    for (; i < len; i++) {
      const ch = s[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '[') {
        depth++;
        continue;
      }
      if (ch === ']') {
        depth--;
        if (depth === 0) {
          i++; // consume closing bracket
          foundEnd = true;
          break;
        }
      }
    }

    if (!foundEnd) break;
    skipWhitespace();
  }

  if (!consumedAnyPinnedBlock) return content;
  return s.slice(i).trimStart();
}

function extractLeadingPinnedBlocks(content: string): { cleanedContent: string; blocks: Array<{ type: string; content: string }> } {
  const s = content.trimStart();
  if (!s.startsWith('[Pinned ')) {
    return { cleanedContent: content, blocks: [] };
  }

  let i = 0;
  const len = s.length;
  const blocks: Array<{ type: string; content: string }> = [];

  const skipWhitespace = () => {
    while (i < len && /\s/.test(s[i])) i++;
  };

  while (i < len) {
    skipWhitespace();
    if (!s.startsWith('[Pinned ', i)) break;

    const blockStart = i;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let blockEndExclusive = -1;

    for (; i < len; i++) {
      const ch = s[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '[') {
        depth++;
        continue;
      }
      if (ch === ']') {
        depth--;
        if (depth === 0) {
          blockEndExclusive = i + 1;
          i++;
          break;
        }
      }
    }

    if (blockEndExclusive === -1) break;

    const blockText = s.slice(blockStart + 1, blockEndExclusive - 1); // remove outer []
    const match = blockText.match(/^Pinned\s+([^:]+):\s*([\s\S]*)$/);
    if (match) {
      blocks.push({
        type: match[1].trim(),
        content: match[2].trim(),
      });
    }

    skipWhitespace();
  }

  return {
    cleanedContent: s.slice(i).trimStart(),
    blocks,
  };
}

interface ChatMessageProps {
  message: Message;
  isLastUserMessage?: boolean;
  isLastAssistantMessage?: boolean;
  isLastStreamingMessage?: boolean;
  onShareModalOpen?: (messageId: string) => void;
  onCopyModalOpen?: (messageId: string) => void;
  onTableChartShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onTableChartCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onTableChartPin?: (content: string, title?: string, type?: 'table' | 'chart' | 'text', messageId?: string) => void;
}

function ChatMessageComponent({ message, isLastUserMessage = false, isLastAssistantMessage = false, isLastStreamingMessage = false, onShareModalOpen, onCopyModalOpen, onTableChartShare, onTableChartCopy, onTableChartPin }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { sendMessage } = useChat();
  const chatActions = useChatActions(); // Get context for suggestion buttons
  const pinnedItems = useAppSelector((state) => state.pinned.items);
  const isResponseGenerating = useAppSelector((state) => {
    const activeConversation = state.chat.conversations.find(
      (conversation) => conversation.id === state.chat.activeConversationId
    );
    const hasLoadingAssistantMessage =
      activeConversation?.messages.some(
        (conversationMessage) =>
          conversationMessage.role === 'assistant' && conversationMessage.isLoading === true
      ) ?? false;
    return state.chat.isStreaming || hasLoadingAssistantMessage;
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);
  const { normalizedMessage } = useMemo(() => {
    const formatted = getMessageContent(message.content); // raw event JSON -> readable text
    if (message.role !== 'user') {
      return { normalizedMessage: { ...message, content: formatted } };
    }

    const extracted = extractLeadingPinnedBlocks(formatted);
    const hasPinnedMetadata = (message.pinnedItems?.length ?? 0) > 0;
    const fallbackPinnedItems: PinnedItem[] = !hasPinnedMetadata && extracted.blocks.length > 0
      ? extracted.blocks.map((block, index) => ({
          id: `derived-pinned-${message.id}-${index}`,
          messageId: message.id,
          conversationId: '',
          content: block.content,
          title: `Pinned ${block.type}`,
          pinnedAt: message.timestamp,
          type: 'response',
        }))
      : [];

    return {
      normalizedMessage: {
        ...message,
        content: stripPinnedContextPrefix(extracted.cleanedContent),
        pinnedItems: hasPinnedMetadata ? message.pinnedItems : fallbackPinnedItems,
      },
    };
  }, [message]); // formatted for display (raw event JSON → readable text)
  // API 200/201 = success → render content (even if it mentions "error" in data failure message)
  // Otherwise use hasError (set when API failed)
  const hasError =
    message.apiStatus === 200 || message.apiStatus === 201 ? false : (message.hasError ?? false);

  // Use consolidated message handlers hook
  const {
    isEditing,
    editedContent,
    isExpanded,
    needsTruncation,
    isFlagged,
    isDisliked,
    isPinned,
    copied,
    handleRetry,
    handleEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleRegenerate,
    handleCopy,
    handleShare,
    handleReportIssue,
    handleDislike,
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
    isSpeaking,
  } = useMessageHandlers({ message: normalizedMessage, onShareModalOpen, onCopyModalOpen, onTableChartShare, onTableChartCopy, onTableChartPin });

  // Adjust textarea height and set cursor to end when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Check if message needs truncation (more than 3 lines)
  useEffect(() => {
    if (!isUser || isEditing) {
      const timeoutId = setTimeout(() => {
        setNeedsTruncation(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    if (!messageContentRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (messageContentRef.current) {
        const maxHeight = 24 * 3; // 72px for 3 lines
        const actualHeight = messageContentRef.current.scrollHeight;
        setNeedsTruncation(actualHeight > maxHeight);
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [isUser, isEditing, normalizedMessage.content, setNeedsTruncation]);

  return (
    <div
      id={`message-${message.id}`}
      data-message-id={message.id}
      className={cn(
        'flex w-full py-1 transition-colors group',
        isUser ? '' : 'bg-transparent'
      )}
      role="article"
      aria-label={isUser ? 'Your message' : 'AI response'}
    >
      {isUser ? (
        <UserMessage
          message={normalizedMessage}
          isEditing={isEditing}
          editedContent={editedContent}
          needsTruncation={needsTruncation}
          isExpanded={isExpanded}
          messageContentRef={messageContentRef}
          textareaRef={textareaRef}
          showEditRegenerate={isLastUserMessage}
          disableEditRegenerate={isResponseGenerating}
          onEdit={handleEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onEditChange={setEditedContent}
          onRegenerate={handleRegenerate}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
        />
      ) : (
        <div className="flex-1 py-3 overflow-hidden">
          <AssistantMessage
            message={normalizedMessage}
            hasError={hasError}
            isStreamingMessage={isLastStreamingMessage}
            isRegenerateEnabled={isLastAssistantMessage}
            onRetry={handleRetry}
            onSuggestionClick={(text) => {
              // Use context's sendMessage which includes scroll functionality
              if (chatActions) {
                chatActions.sendMessage(text);
              } else {
                // Fallback to regular sendMessage if context not available
                sendMessage(text);
              }
            }}
            onReportIssue={handleReportIssue}
            onDislike={handleDislike}
            onRegenerate={handleRegenerate}
            onReadAloud={handleReadAloud}
            onShare={handleShare}
            onCopy={handleCopy}
            onPin={handlePin}
            isFlagged={isFlagged}
            isDisliked={isDisliked}
            isMuted={!isSpeaking}
            isPinned={isPinned}
            copied={copied}
            onTableCopy={handleTableCopy}
            onTablePin={handleTablePin}
            onTableUnpin={handleTableUnpin}
            onTableShare={handleTableShare}
            onChartCopy={handleChartCopy}
            onChartPin={handleChartPin}
            onChartUnpin={handleChartUnpin}
            onChartShare={handleChartShare}
            pinnedItems={pinnedItems}
          />
        </div>
      )}
    </div>
  );
}

// Memoize ChatMessage to prevent re-rendering when scroll button visibility changes
// Uses shallow comparison - will re-render if message object reference changes (which is correct)
export default memo(ChatMessageComponent);

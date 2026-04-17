'use client';

import type { Message } from '@/types';
import LoadingSpinner from '@/components/ui/loading-spinner';
import MarkdownRenderer from '@/components/ui/markdown-renderer';
import { formatMessageContentForDisplay } from '@/lib/utils/formatMessageContent';
import { TypingContent } from '../TypingContent';
import { MessageActions } from './MessageActions';
import { ChatError } from '@/components/chat/ChatError';
import { COLORS, BORDER_RADIUS } from '@/lib/styles/commonStyles';

interface AssistantMessageProps {
  message: Message;
  hasError: boolean;
  isStreamingMessage?: boolean;
  isRegenerateEnabled?: boolean;
  onRetry: () => void;
  onSuggestionClick: (suggestion: string) => void;
  onReportIssue: () => void;
  onDislike: () => void;
  onRegenerate: () => void;
  onReadAloud: () => void;
  onShare: () => void;
  onCopy: () => void;
  onPin: () => void;
  isFlagged: boolean;
  isDisliked: boolean;
  isMuted: boolean;
  isPinned: boolean;
  copied: boolean;
  onTableCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onTablePin?: (tableData: string) => void;
  onTableUnpin?: (tableData: string) => void;
  onTableShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onChartCopy?: (type: 'table' | 'chart', content: string, title?: string) => void;
  onChartPin?: (chartData: string) => void;
  onChartUnpin?: (chartData: string) => void;
  onChartShare?: (type: 'table' | 'chart', content: string, title?: string) => void;
  pinnedItems?: Array<{ content: string }>;
}

export function AssistantMessage({
  message,
  hasError,
  isStreamingMessage = false,
  isRegenerateEnabled = true,
  onRetry,
  onSuggestionClick,
  onReportIssue,
  onDislike,
  onRegenerate,
  onReadAloud,
  onShare,
  onCopy,
  onPin,
  isFlagged,
  isDisliked,
  isMuted,
  isPinned,
  copied,
  onTableCopy,
  onTablePin,
  onTableUnpin,
  onTableShare,
  onChartCopy,
  onChartPin,
  onChartUnpin,
  onChartShare,
  pinnedItems,
}: AssistantMessageProps) {
  if (hasError) {
    return (
      <ChatError
        errorMessage={message.errorMessage || 'An error occurred while processing your request.'}
        errorType={message.errorType}
        onRetry={message.role === 'assistant' ? onRetry : undefined}
      />
    );
  }

  // Pro styling only when API response has is_pro=true, never during loading
  const isPro = !message.isLoading && message.is_pro === true;

  // Format content so raw batch2 JSON is wrapped for proper rendering (charts, tables, etc.)
  const displayContent = formatMessageContentForDisplay(message.content ?? '');

  const markdownRendererProps = {
    className: 'bot-response-text',
    onSuggestionClick,
    onTableCopy,
    onTablePin,
    onTableUnpin,
    onTableShare,
    onChartCopy,
    onChartPin,
    onChartUnpin,
    onChartShare,
    pinnedItems,
  };

  return (
    <>
      <div
        className="flex-1 flex flex-col"
        style={{
          alignSelf: 'stretch',
          ...(isPro && {
            backgroundColor: COLORS.electricViolet[50],
            border: `1px solid ${COLORS.electricViolet[100]}`,
            borderRadius: BORDER_RADIUS.md,
            padding: '12px 16px',
          }),
        }}
      >
        {isPro && (
          <div className="flex justify-end w-full">
            <span
              className="inline-flex items-center w-fit px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'transparent',
                border: `1px solid ${COLORS.electricViolet[600]}`,
                color: COLORS.electricViolet[600],
                letterSpacing: '0.5px',
              }}
            >
              Pro
            </span>
          </div>
        )}
        <div
          className="prose prose-sm max-w-none text-gray-800 text-[14px]"
          style={{ alignSelf: 'stretch', fontSize: '14px', lineHeight: '22px' }}
        >
          {message.isLoading ? (
            <LoadingSpinner text="Thinking..." />
          ) : isStreamingMessage && displayContent ? (
            <TypingContent content={displayContent} isStreaming={true}>
              {(displayedContent) => (
                <MarkdownRenderer
                  content={displayedContent}
                  {...markdownRendererProps}
                />
              )}
            </TypingContent>
          ) : (
            <MarkdownRenderer
              content={displayContent}
              {...markdownRendererProps}
            />
          )}
        </div>
      </div>

      {/* Assistant message actions */}
      {!hasError && !message.isLoading && (
        <MessageActions
          onReportIssue={onReportIssue}
          onDislike={onDislike}
          onRegenerate={onRegenerate}
          isRegenerateEnabled={isRegenerateEnabled}
          onReadAloud={onReadAloud}
          onShare={onShare}
          onCopy={onCopy}
          onPin={onPin}
          isFlagged={isFlagged}
          isDisliked={isDisliked}
          isMuted={isMuted}
          isPinned={isPinned}
          copied={copied}
        />
      )}
    </>
  );
}


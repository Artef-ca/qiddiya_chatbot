'use client';

import { User, Pencil, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import FileAttachmentCard from '@/components/chat/FileAttachmentCard';
import PinnedItemCard from '@/components/chat/PinnedItemCard';
import MarkdownRenderer from '@/components/ui/markdown-renderer';
import { MessageEdit } from './MessageEdit';
import { CARD_STYLES, AVATAR_STYLES, TEXT_STYLES, COLORS, BUTTON_STYLES } from '@/lib/styles/commonStyles';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

interface UserMessageProps {
  message: Message;
  isEditing: boolean;
  editedContent: string;
  needsTruncation: boolean;
  isExpanded: boolean;
  messageContentRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  showEditRegenerate?: boolean;
  disableEditRegenerate?: boolean;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (value: string) => void;
  onRegenerate: () => void;
  onToggleExpand: () => void;
}

export function UserMessage({
  message,
  isEditing,
  editedContent,
  needsTruncation,
  isExpanded,
  messageContentRef,
  textareaRef,
  showEditRegenerate = true,
  disableEditRegenerate = false,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onRegenerate,
  onToggleExpand,
}: UserMessageProps) {
  const router = useRouter();
  const globalPinnedItems = useAppSelector((state) => state.pinned.items);
  const { activeConversationId } = useAppSelector((state) => state.chat);

  const handlePinnedItemSelect = (
    conversationId: string,
    messageId: string,
    itemContent: string
  ) => {
    // Resolve missing metadata (can happen for derived/fallback pinned items after rehydration)
    let targetConversationId = conversationId;
    let targetMessageId = messageId;

    if (!targetConversationId || !targetMessageId) {
      const resolved = globalPinnedItems.find((p) => {
        const sameContent = (p.content || '').trim() === (itemContent || '').trim();
        const sameTitle =
          (p.title || '').trim() !== '' &&
          (p.title || '').trim() === (itemContent || '').trim();
        return sameContent || sameTitle;
      });

      if (resolved) {
        targetConversationId = resolved.conversationId;
        targetMessageId = resolved.messageId;
      }
    }

    if (!targetMessageId) return;
    const targetId = `message-${targetMessageId}`;
    const target = typeof document !== 'undefined' ? document.getElementById(targetId) : null;

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const fallbackConversationId = targetConversationId || activeConversationId || '';
    if (!fallbackConversationId) return;
    router.push(`/chat/${fallbackConversationId}#${targetId}`);
  };

  return (
    <div className="flex-1">
      <div
        className="relative"
        style={CARD_STYLES.userMessageCard}
      >
        {/* Attachments and Pinned Items */}
        {((message.attachments && message.attachments.length > 0) || (message.pinnedItems && message.pinnedItems.length > 0)) && (
          <div className="flex flex-wrap gap-2 mb-2 ps-11">
            {message.attachments?.map((attachment) => (
              <FileAttachmentCard
                key={attachment.id}
                attachment={attachment}
                showRemove={false}
              />
            ))}
            {message.pinnedItems?.map((item) => (
              <PinnedItemCard
                key={item.id}
                item={item}
                showRemove={false}
                onSelect={(selectedItem) =>
                  handlePinnedItemSelect(
                    selectedItem.conversationId,
                    selectedItem.messageId,
                    selectedItem.content
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Avatar and Message Content */}
        <div className="flex items-start gap-3 w-full">
          {/* User Avatar */}
          <div
            className="flex shrink-0 items-center justify-center"
            style={AVATAR_STYLES.userAvatar}
            aria-hidden="true"
          >
            <User 
              style={{
                width: '16px',
                height: '16px',
                color: COLORS.lynch[700]
              }} 
              aria-hidden="true" 
            />
          </div>
          
          {/* Message content */}
          <div className="flex-1 min-w-0 relative">
            {isEditing ? (
              <MessageEdit
                value={editedContent}
                onChange={onEditChange}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
                textareaRef={textareaRef}
              />
            ) : (
              <div 
                ref={messageContentRef}
                className={cn(
                  'user-message-content-wrapper',
                  needsTruncation && !isExpanded && 'truncated'
                )}
                style={{
                  ...TEXT_STYLES.userMessage,
                  margin: '5px 0',
                  ...(needsTruncation && !isExpanded ? {
                    maxHeight: '72px',
                    overflow: 'hidden',
                    position: 'relative',
                  } : {}),
                }}
              >
                <style dangerouslySetInnerHTML={{__html: `
                  .user-message-content p,
                  .user-message-content ul,
                  .user-message-content ol,
                  .user-message-content li {
                    color: var(--Lynch-800, #3A4252) !important;
                    font-family: Manrope !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    line-height: 22px !important;
                    margin: 0 !important;
                  }
                  .user-message-content-wrapper.truncated::after {
                    content: '...';
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    padding-left: 8px;
                    color: var(--Lynch-800, #3A4252);
                    font-weight: 600;
                  }
                `}} />
                <MarkdownRenderer 
                  content={message.content} 
                  className="user-message-content"
                />
              </div>
            )}
          </div>
        </div>

        {/* Expand/Collapse, Edit and Regenerate icons */}
        {!isEditing && (needsTruncation || showEditRegenerate) && (
          <div className="flex items-center justify-between w-full self-end">
            {/* Left side - Arrow icon */}
            <div className="flex items-center ps-11">
              {needsTruncation && (
                <button
                  onClick={onToggleExpand}
                  className="flex items-center justify-center transition-colors"
                  style={BUTTON_STYLES.iconButton}
                  aria-label={isExpanded ? "Collapse message" : "Expand message"}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronUp 
                      style={{
                        width: '16px',
                        height: '16px',
                        color: COLORS.lynch[700]
                      }} 
                    />
                  ) : (
                    <ChevronDown 
                      style={{
                        width: '16px',
                        height: '16px',
                        color: COLORS.lynch[700]
                      }} 
                    />
                  )}
                </button>
              )}
            </div>
            
            {/* Right side - Edit and Regenerate icons (only for last user message) */}
            {showEditRegenerate && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onEdit}
                  disabled={disableEditRegenerate}
                  className="flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={BUTTON_STYLES.iconButton}
                  aria-label="Edit message"
                  title={disableEditRegenerate ? 'Edit (disabled while response is generating)' : 'Edit'}
                >
                  <Pencil 
                    style={{
                      width: '16px',
                      height: '16px',
                      color: COLORS.lynch[700]
                    }} 
                  />
                </button>
                <button
                  onClick={onRegenerate}
                  disabled={disableEditRegenerate}
                  className="flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={BUTTON_STYLES.iconButton}
                  aria-label="Regenerate"
                  title={disableEditRegenerate ? 'Regenerate (disabled while response is generating)' : 'Regenerate'}
                >
                  <RotateCcw  
                    style={{
                      width: '16px',
                      height: '16px',
                      color: COLORS.lynch[700]
                    }} 
                  />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


'use client';

import { useRef } from 'react';
import { GRADIENT_STYLES } from '@/lib/styles/commonStyles';
import GroupChatListItem from './GroupChatListItem';
import type { Conversation } from '@/types';

interface GroupChatListProps {
  conversations: Conversation[];
  selectedConversations: Set<string>;
  onSelectConversation: (conversationId: string) => void;
  onConversationClick?: (conversationId: string) => void;
  onPinClick?: (conversationId: string) => void;
  groupId: string;
  selectedChatForPins?: string | null; // The conversation ID whose pin icon is active
}

export default function GroupChatList({
  conversations,
  selectedConversations,
  onSelectConversation,
  onConversationClick,
  onPinClick,
  groupId,
  selectedChatForPins = null,
}: GroupChatListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden relative"
    >
      {/* Gradient Reveal Top */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: '24px',
          ...GRADIENT_STYLES.topGradient,
        }}
      />

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{
          paddingTop: '24px',
          paddingBottom: '48px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
            <p
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '24px',
                color: '#84848C', // Jumbo-400
              }}
            >
              No chats in this group
            </p>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: '8px', width: '100%' }}>
            {conversations.map((conversation) => (
              <GroupChatListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversations.has(conversation.id)}
                onSelect={() => onSelectConversation(conversation.id)}
                onClick={onConversationClick ? () => onConversationClick(conversation.id) : undefined}
                onPinClick={onPinClick ? () => onPinClick(conversation.id) : undefined}
                groupId={groupId}
                isPinFilterActive={selectedChatForPins === conversation.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Gradient Reveal Bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: '48px',
          ...GRADIENT_STYLES.bottomGradient,
        }}
      />
    </div>
  );
}


'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import ChatListItem from './ChatListItem';
import { GRADIENT_STYLES } from '@/lib/styles/commonStyles';
import { useRouter } from 'next/navigation';
import type { Conversation } from '@/types';
import EmptyState from '@/components/ui/EmptyState';
import { MessageSquareText, MessageSquarePlus } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { setActiveConversation } from '@/store/slices/chatSlice';
import { clearProState } from '@/lib/chatProState';
import LoadingIndicator from './LoadingIndicator';
import { CONSTANTS } from '@/lib/utils/constants';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
}

interface ChatListProps {
  conversations: Conversation[];
  selectedChats: Set<string>;
  onSelectChat: (id: string) => void;
  isLoading?: boolean;
  groups?: Group[];
  filter?: 'active' | 'starred' | 'archived';
}

// Constants for chat list pagination
const CHAT_INITIAL_DISPLAY_COUNT = 7;
const CHAT_LOAD_MORE_COUNT = 7;

const EMPTY_TITLES: Record<'active' | 'starred' | 'archived', string> = {
  active: 'You currently have no chats.',
  starred: 'You currently have no starred chats.',
  archived: 'You currently have no archived chats.',
};

export default function ChatList({
  conversations,
  selectedChats,
  onSelectChat,
  isLoading = false,
  groups = [],
  filter = 'active',
}: ChatListProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [displayedCount, setDisplayedCount] = useState<number>(CHAT_INITIAL_DISPLAY_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const conversationsKeyRef = useRef<string>('');
  const isLoadingMoreRef = useRef<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const displayedCountRef = useRef<number>(CHAT_INITIAL_DISPLAY_COUNT);
  const conversationsRef = useRef<Conversation[]>(conversations);

  // Create a key from conversation IDs to detect when the list actually changes
  const conversationsKey = useMemo(() => {
    return conversations.map(c => c.id).join(',');
  }, [conversations]);

  // Update refs when state changes
  useEffect(() => {
    displayedCountRef.current = displayedCount;
  }, [displayedCount]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Reset displayed count when conversations change (e.g., filter/search)
  useEffect(() => {
    if (conversationsKeyRef.current !== conversationsKey) {
      conversationsKeyRef.current = conversationsKey;
      requestAnimationFrame(() => {
        setDisplayedCount(CHAT_INITIAL_DISPLAY_COUNT);
        displayedCountRef.current = CHAT_INITIAL_DISPLAY_COUNT;
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
      });
    }
  }, [conversationsKey]);

  // Get conversations to display based on pagination
  const conversationsToDisplay = conversations.slice(0, displayedCount);
  const hasMore = displayedCount < conversations.length;

  const handleChatClick = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  const handleNewChat = () => {
    clearProState();
    dispatch(setActiveConversation(null));
    router.push('/');
  };

  // Update ref when loading state changes
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  // Infinite scroll: Load more items when scrolling near bottom
  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!hasMore || conversations.length === 0) return;

    // Use a small delay to ensure DOM is ready, especially after page refresh
    const timeoutId = setTimeout(() => {
      const scrollContainer = scrollContainerRef.current;
      const loadMoreElement = loadMoreRef.current;
      
      if (!scrollContainer || !loadMoreElement || !hasMore) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const firstEntry = entries[0];
          // Use refs to get current values to avoid stale closures
          const currentDisplayedCount = displayedCountRef.current;
          const currentConversations = conversationsRef.current;
          const currentHasMore = currentDisplayedCount < currentConversations.length;
          
          if (firstEntry.isIntersecting && currentHasMore && !isLoadingMoreRef.current) {
            isLoadingMoreRef.current = true;
            setIsLoadingMore(true);
            
            // Simulate API delay
            setTimeout(() => {
              setDisplayedCount((prev) => {
                const newCount = Math.min(prev + CHAT_LOAD_MORE_COUNT, currentConversations.length);
                displayedCountRef.current = newCount;
                isLoadingMoreRef.current = false;
                setIsLoadingMore(false);
                return newCount;
              });
            }, 500); // 500ms delay to show loader
          }
        },
        {
          root: scrollContainer,
          rootMargin: CONSTANTS.INTERSECTION_OBSERVER.ROOT_MARGIN,
          threshold: CONSTANTS.INTERSECTION_OBSERVER.THRESHOLD,
        }
      );

      observer.observe(loadMoreElement);
      observerRef.current = observer;
    }, 50); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [hasMore, conversations.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <LoadingIndicator text="Loading chats..." />
      </div>
    );
  }

  // Show empty state when there are no conversations matching the current filter
  // This works for all tabs: active, starred, and archived
  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1">
        <EmptyState
          icon={MessageSquareText}
          title={EMPTY_TITLES[filter]}
          titleWidth="506px"
          actionButton={{
            icon: MessageSquarePlus,
            label: 'Start Chat',
            onClick: handleNewChat,
          }}
        />
      </div>
    );
  }

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
        <div
          className="flex flex-col"
          style={{
            width: '862px',
            marginLeft: 'calc(50% - 427px)',
            gap: '8px',
          }}
        >
          {conversationsToDisplay.map((conversation) => (
            <ChatListItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedChats.has(conversation.id)}
              onSelect={() => onSelectChat(conversation.id)}
              onClick={() => handleChatClick(conversation.id)}
              groups={groups}
            />
          ))}
          
          {/* Loading indicator for pagination */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 0',
                minHeight: '60px',
              }}
            >
              {isLoadingMore && <LoadingIndicator text="Loading chats..." />}
            </div>
          )}
        </div>
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

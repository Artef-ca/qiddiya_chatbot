'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { CONSTANTS } from '@/lib/utils/constants';
import type { Conversation } from '@/types';
import type { LucideIcon } from 'lucide-react';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  allConversations?: Conversation[];
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  iconStyle?: React.CSSProperties;
  showViewAll?: boolean;
  isFirstSection?: boolean;
}

export default function ConversationList({
  conversations,
  allConversations,
  title,
  icon: Icon,
  showViewAll = false,
  isFirstSection = false
}: ConversationListProps) {
  // Suppress unused variable warnings - may be used for future styling
  void Icon;
  const [viewAll, setViewAll] = useState(false);
  const [displayedCount, setDisplayedCount] = useState<number>(CONSTANTS.INITIAL_DISPLAY_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Use all conversations when viewAll is enabled
  const conversationsToDisplay = viewAll && allConversations 
    ? allConversations.slice(0, displayedCount)
    : conversations;
  
  const hasMore = viewAll && allConversations 
    ? displayedCount < allConversations.length 
    : false;

  const handleViewAll = () => {
    setViewAll(true);
    setDisplayedCount(CONSTANTS.INITIAL_DISPLAY_COUNT * 2);
  };

  // Infinite scroll: Load more items when scrolling near bottom
  useEffect(() => {
    if (!viewAll || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore) {
          setDisplayedCount((prev) => Math.min(prev + CONSTANTS.LOAD_MORE_COUNT, allConversations?.length || 0));
        }
      },
      {
        root: null,
        rootMargin: CONSTANTS.INTERSECTION_OBSERVER.ROOT_MARGIN,
        threshold: CONSTANTS.INTERSECTION_OBSERVER.THRESHOLD,
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [viewAll, hasMore, allConversations?.length]);

  if (conversations.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div 
        className={cn(
          "sticky top-0 z-10 flex items-center gap-2 px-4 pt-2 bg-white",
          !isFirstSection && "z-20"
        )}
      >
        <h3 
          style={{
            flex: '1 0 0',
            color: '#8695AA',
            fontFamily: 'Manrope, var(--font-manrope)',
            fontSize: '10px',
            fontWeight: 600,
            lineHeight: '16px',
            letterSpacing: '0.18px'
          }}
        >
          {title}
        </h3>
      </div>
      <div className="px-2">
        <div role="list" aria-label={`${title} conversations`}>
          {conversationsToDisplay.map((conversation, index) => (
            <ConversationItem 
              key={conversation.id} 
              conversation={conversation}
              index={index}
              totalCount={conversationsToDisplay.length}
            />
          ))}
        
          {/* View All Chats Button */}
          {showViewAll && !viewAll && (
            <button
              onClick={handleViewAll}
              className="inline-block text-left px-3 py-2 text-xs rounded-lg transition-colors font-medium focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
              style={{
                color: cssVar(CSS_VARS.primary600),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = cssVar(CSS_VARS.primary700);
                e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = cssVar(CSS_VARS.primary600);
                e.currentTarget.style.backgroundColor = '';
              }}
              aria-label="View all conversations"
            >
              View All Chats
            </button>
          )}
        
          {/* Load More Trigger for Infinite Scroll */}
          {viewAll && hasMore && (
            <div ref={loadMoreRef} className="h-4 w-full" />
          )}
        </div>
      </div>
    </div>
  );
}


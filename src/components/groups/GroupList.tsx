'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import GroupListItem from './GroupListItem';
import { GRADIENT_STYLES } from '@/lib/styles/commonStyles';
import EmptyState from '@/components/ui/EmptyState';
import { Layers } from 'lucide-react';
import LoadingIndicator from '@/components/chats/LoadingIndicator';
import { CONSTANTS } from '@/lib/utils/constants';
import type { Conversation } from '@/types';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
  starred?: boolean;
  archived?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface GroupListProps {
  groups: Group[];
  selectedGroups: Set<string>;
  onSelectGroup: (id: string) => void;
  isLoading?: boolean;
  conversations?: Conversation[];
  filter?: 'active' | 'starred' | 'archived';
  onCreateGroup?: () => void;
}

const EMPTY_TITLES: Record<'active' | 'starred' | 'archived', string> = {
  active: 'You currently have no groups.',
  starred: 'You currently have no starred groups.',
  archived: 'You currently have no archived groups.',
};

// Constants for group list pagination
const GROUP_INITIAL_DISPLAY_COUNT = 7;
const GROUP_LOAD_MORE_COUNT = 7;

export default function GroupList({
  groups,
  selectedGroups,
  onSelectGroup,
  isLoading = false,
  conversations = [],
  filter = 'active',
  onCreateGroup,
}: GroupListProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [displayedCount, setDisplayedCount] = useState<number>(GROUP_INITIAL_DISPLAY_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const groupsKeyRef = useRef<string>('');
  const isLoadingMoreRef = useRef<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const displayedCountRef = useRef<number>(GROUP_INITIAL_DISPLAY_COUNT);
  const groupsRef = useRef<Group[]>(groups);

  // Create a key from group IDs to detect when the list actually changes
  const groupsKey = useMemo(() => {
    return groups.map(g => g.id).join(',');
  }, [groups]);

  // Update refs when state changes
  useEffect(() => {
    displayedCountRef.current = displayedCount;
  }, [displayedCount]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // Reset displayed count when groups change (e.g., filter/search)
  useEffect(() => {
    if (groupsKeyRef.current !== groupsKey) {
      groupsKeyRef.current = groupsKey;
      requestAnimationFrame(() => {
        setDisplayedCount(GROUP_INITIAL_DISPLAY_COUNT);
        displayedCountRef.current = GROUP_INITIAL_DISPLAY_COUNT;
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
      });
    }
  }, [groupsKey]);

  // Get groups to display based on pagination
  const groupsToDisplay = groups.slice(0, displayedCount);
  const hasMore = displayedCount < groups.length;

  const handleGroupClick = (groupId: string) => {
    // Navigate to group detail page
    router.push(`/groups/${groupId}`);
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

    if (!hasMore || groups.length === 0) return;

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
          const currentGroups = groupsRef.current;
          const currentHasMore = currentDisplayedCount < currentGroups.length;
          
          if (firstEntry.isIntersecting && currentHasMore && !isLoadingMoreRef.current) {
            isLoadingMoreRef.current = true;
            setIsLoadingMore(true);
            
            // Simulate API delay
            setTimeout(() => {
              setDisplayedCount((prev) => {
                const newCount = Math.min(prev + GROUP_LOAD_MORE_COUNT, currentGroups.length);
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
  }, [hasMore, groups.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <LoadingIndicator text="Loading groups..." />
      </div>
    );
  }

  // Show empty state when there are no groups matching the current filter
  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1">
        <EmptyState
          icon={Layers}
          title={EMPTY_TITLES[filter]}
          titleWidth="506px"
          actionButton={
            onCreateGroup
              ? {
                  icon: Layers,
                  label: 'Create Group',
                  onClick: onCreateGroup,
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden relative"
    >
      {/* Gradient Reveal Top - Fixed at top while scrolling */}
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
          {groupsToDisplay.map((group) => (
            <GroupListItem
              key={group.id}
              group={group}
              isSelected={selectedGroups.has(group.id)}
              onSelect={() => onSelectGroup(group.id)}
              onClick={() => handleGroupClick(group.id)}
              conversations={conversations}
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
              {isLoadingMore && <LoadingIndicator text="Loading groups..." />}
            </div>
          )}
        </div>
      </div>

      {/* Gradient Reveal Bottom - Fixed at bottom while scrolling */}
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


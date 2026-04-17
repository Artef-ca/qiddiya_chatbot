'use client';

import { useState, useMemo } from 'react';
import PageHeader from './PageHeader';
import ChatList from './ChatList';
import DeleteChatModal from './DeleteChatModal';
import AddToGroupModal from './AddToGroupModal';
import { useConversations } from '@/hooks/useConversations';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { archiveConversations, unarchiveConversations, toggleArchiveConversation } from '@/store/slices/chatSlice';
import { addToast } from '@/store/slices/uiSlice';
import { cn } from '@/lib/utils';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

interface GroupOption {
  id: string;
  name: string;
  conversationIds: string[];
}

function isGroupOption(value: unknown): value is GroupOption {
  if (!value || typeof value !== 'object') return false;
  const maybeGroup = value as Record<string, unknown>;
  return (
    typeof maybeGroup.id === 'string' &&
    typeof maybeGroup.name === 'string' &&
    Array.isArray(maybeGroup.conversationIds)
  );
}

export default function ChatListingPage() {
  const dispatch = useAppDispatch();
  const { conversations: apiConversations, groups, isLoading, updateConversationAsync } = useConversations();
  // Ensure pinned items are fetched and Redux hydrated so pin counts show correctly
  usePinnedItems();
  const { conversations: reduxConversations } = useAppSelector((state) => state.chat);
  const safeGroups: GroupOption[] = (Array.isArray(groups) ? (groups as unknown[]) : []).filter(isGroupOption);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'starred' | 'archived'>('active');
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddToGroupModalOpen, setIsAddToGroupModalOpen] = useState(false);

  const handleFilterChange = (nextFilter: 'active' | 'starred' | 'archived') => {
    if (nextFilter === filter) return;
    setSelectedChats(new Set());
    setFilter(nextFilter);
  };

  // Merge conversations from both Redux and API sources
  // Redux conversations take precedence for immediate updates (starred status, etc.)
  // API conversations provide the source of truth for persisted data
  const conversations = useMemo(() => {
    const conversationMap = new Map<string, typeof reduxConversations[0]>();
    
    // First, add all API conversations
    apiConversations.forEach(conv => {
      conversationMap.set(conv.id, conv);
    });
    
    // Then, add/update with Redux conversations (these take precedence for immediate updates)
    reduxConversations.forEach(conv => {
      conversationMap.set(conv.id, conv);
    });

    // Always show most recently updated chats first.
    // This ensures newly created conversations appear at the top immediately.
    return Array.from(conversationMap.values()).sort((a, b) => {
      const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });
  }, [apiConversations, reduxConversations]);

  // Filter conversations based on search and filter
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Apply filter
      if (filter === 'starred') {
        // Starred tab shows only non-archived starred chats
        if (!conv.starred || conv.archived) return false;
      } else if (filter === 'archived') {
        // Archived tab shows only archived chats
        if (!conv.archived) return false;
      } else if (filter === 'active') {
        // Active tab shows only non-archived chats
        if (conv.archived) return false;
      }
      
      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          conv.title.toLowerCase().includes(query) ||
          (conv.messages ?? []).some((msg) => {
            const content = typeof msg.content === 'string' ? msg.content : (msg.content != null ? String(msg.content) : '');
            return content.toLowerCase().includes(query);
          })
        );
      }
      
      return true;
    });
  }, [conversations, filter, searchQuery]);

  return (
    <div
      className={cn('flex flex-col h-full overflow-hidden')}
      style={{
        backgroundColor: cssVar(CSS_VARS.gray50),
        paddingTop: '48px',
        paddingLeft: 'clamp(16px, calc((100vw - 862px) / 2), 288px)',
        paddingRight: 'clamp(16px, calc((100vw - 862px) / 2), 288px)',
        paddingBottom: '0',
      }}
    >
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={handleFilterChange}
        selectedCount={selectedChats.size}
        totalCount={filteredConversations.length}
        onSelectAll={() => {
          setSelectedChats(new Set(filteredConversations.map(c => c.id)));
        }}
        onDeselectAll={() => {
          setSelectedChats(new Set());
        }}
        onDeleteClick={() => {
          if (selectedChats.size > 0) {
            setIsDeleteModalOpen(true);
          }
        }}
        onAddToGroupClick={() => {
          if (selectedChats.size > 0) {
            setIsAddToGroupModalOpen(true);
          }
        }}
        onArchiveClick={async () => {
          if (selectedChats.size > 0) {
            const conversationsToArchive = filteredConversations.filter((c) => selectedChats.has(c.id));
            const count = conversationsToArchive.length;
            
            // Optimistically update Redux
            dispatch(archiveConversations(Array.from(selectedChats)));
            
            // Update via API
            try {
              await Promise.all(
                conversationsToArchive.map(conv =>
                  updateConversationAsync({
                    id: conv.id,
                    updates: { archived: true }
                  })
                )
              );
              
              // Show success notification
              const message = count === 1 
                ? '1 chat was successfully archived'
                : `${count} chats were successfully archived`;
              
              dispatch(addToast({
                type: 'success',
                message,
                duration: 5000,
              }));
              
              // Clear selection
              setSelectedChats(new Set());
            } catch (error) {
              console.error('Error archiving conversations:', error);
              // Revert optimistic update on error - toggle back to unarchived
              conversationsToArchive.forEach(conv => {
                dispatch(toggleArchiveConversation(conv.id));
              });
            }
          }
        }}
        onUnarchiveClick={async () => {
          if (selectedChats.size > 0) {
            const conversationsToUnarchive = filteredConversations.filter((c) => selectedChats.has(c.id));
            const count = conversationsToUnarchive.length;
            
            // Optimistically update Redux
            dispatch(unarchiveConversations(Array.from(selectedChats)));
            
            // Update via API
            try {
              await Promise.all(
                conversationsToUnarchive.map(conv =>
                  updateConversationAsync({
                    id: conv.id,
                    updates: { archived: false }
                  })
                )
              );
              
              // Show success notification
              const message = count === 1 
                ? '1 chat was successfully unarchived'
                : `${count} chats were successfully unarchived`;
              
              dispatch(addToast({
                type: 'success',
                message,
                duration: 5000,
              }));
              
              // Clear selection
              setSelectedChats(new Set());
            } catch (error) {
              console.error('Error unarchiving conversations:', error);
              // Revert optimistic update on error - toggle back to archived
              conversationsToUnarchive.forEach(conv => {
                dispatch(toggleArchiveConversation(conv.id));
              });
            }
          }
        }}
      />
      
      <ChatList
        conversations={filteredConversations}
        selectedChats={selectedChats}
        filter={filter}
        onSelectChat={(id) => {
          setSelectedChats(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            return next;
          });
        }}
        isLoading={isLoading}
        groups={safeGroups}
      />

      {/* Delete Chat Modal for Bulk Delete */}
      <DeleteChatModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        conversationsToDelete={filteredConversations.filter((c) => selectedChats.has(c.id))}
        onDeleteComplete={() => {
          setSelectedChats(new Set());
        }}
      />

      {/* Add to Group Modal for Bulk Selection */}
      <AddToGroupModal
        isOpen={isAddToGroupModalOpen}
        onClose={() => setIsAddToGroupModalOpen(false)}
        conversations={filteredConversations.filter((c) => selectedChats.has(c.id))}
        groups={safeGroups}
        onAddComplete={() => {
          setSelectedChats(new Set());
        }}
      />
    </div>
  );
}


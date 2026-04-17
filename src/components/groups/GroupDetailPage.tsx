'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import GroupDetailHeader from './GroupDetailHeader/index';
import GroupChatList from './GroupChatList';
import GroupPinnedItemsPanel from './GroupPinnedItemsPanel';
import RenameGroupModal from './RenameGroupModal';
import DeleteGroupModal from './DeleteGroupModal';
import LoadingIndicator from '@/components/chats/LoadingIndicator';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const groupId = params?.groupId as string;
  
  const { conversations, isLoading: isLoadingConversations } = useConversations();
  const { groups, isLoading: isLoadingGroups, updateGroup, removeConversationsFromGroup } = useGroups();
  // Ensure pinned items are fetched and Redux hydrated so group pinned panel and per-conversation filter work
  usePinnedItems();
  
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [selectedChatForPins, setSelectedChatForPins] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filter] = useState<'active' | 'starred' | 'archived'>('active');
  
  const isLoading = isLoadingConversations || isLoadingGroups;
  
  // Find the current group
  const group = useMemo(() => {
    if (!groups || !groupId) return null;
    return groups.find(g => g.id === groupId) || null;
  }, [groups, groupId]);
  
  // Get conversations in this group
  const groupConversations = useMemo(() => {
    if (!group || !conversations) return [];
    return conversations.filter(conv => group.conversationIds.includes(conv.id));
  }, [group, conversations]);
  
  // Filter conversations based on active/starred/archived
  const filteredConversations = useMemo(() => {
    if (!groupConversations) return [];
    
    return groupConversations.filter(conv => {
      if (filter === 'starred') {
        return conv.starred === true;
      } else if (filter === 'archived') {
        return conv.archived === true;
      } else {
        return !conv.archived;
      }
    });
  }, [groupConversations, filter]);
  
  // Handle pin icon click on chat card
  const handlePinIconClick = (conversationId: string) => {
    if (selectedChatForPins === conversationId) {
      // If already selected, deselect to show all pins
      setSelectedChatForPins(null);
    } else {
      // Select this chat to filter pins
      setSelectedChatForPins(conversationId);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };
  
  // Selection handlers
  const handleSelectChat = (chatId: string) => {
    setSelectedChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };
  
  const handleSelectAll = () => {
    setSelectedChats(new Set(filteredConversations.map(c => c.id)));
  };
  
  const handleDeselectAll = () => {
    setSelectedChats(new Set());
  };
  
  const isIndeterminate = selectedChats.size > 0 && selectedChats.size < filteredConversations.length;
  const isAllSelected = selectedChats.size === filteredConversations.length && filteredConversations.length > 0;
  
  // Handle group actions
  const handleRename = () => {
    setIsRenameModalOpen(true);
  };
  
  const handleStar = async () => {
    if (!group) return;
    try {
      await updateGroup({
        groupId: group.id,
        updates: { starred: !group.starred },
      });
    } catch (error) {
      console.error('Failed to star group:', error);
    }
  };
  
  const handleArchive = async () => {
    if (!group || selectedChats.size === 0) return;
    // Archive selected chats
    // This will be handled by the chat actions
  };
  
  const handleDelete = () => {
    if (selectedChats.size > 0) {
      // Delete action will be handled by the chat actions
    }
  };

  const handleArchiveGroup = async () => {
    if (!group) return;
    try {
      await updateGroup({
        groupId: group.id,
        updates: { archived: !group.archived },
      });
      dispatch(addToast({
        type: 'success',
        message: group.archived
          ? `${group.name} was successfully unarchived`
          : `${group.name} was successfully archived`,
      }));
    } catch (error) {
      console.error('Failed to archive group:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to update the group. Please try again later.',
      }));
    }
  };

  const handleDeleteGroup = () => {
    if (group) {
      setIsDeleteModalOpen(true);
    }
  };

  const handleUnGroup = async () => {
    if (!group || selectedChats.size === 0) return;
    try {
      await removeConversationsFromGroup({
        groupId: group.id,
        conversationIds: Array.from(selectedChats),
      });
      // Show success toast
      dispatch(addToast({
        type: 'success',
        message: `${selectedChats.size} chat${selectedChats.size > 1 ? 's' : ''} removed from group successfully`,
      }));
      // Clear selection after ungrouping
      setSelectedChats(new Set());
    } catch (error) {
      console.error('Failed to ungroup chats:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to remove chats from group',
      }));
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingIndicator text="Loading groups..." />
      </div>
    );
  }
  
  if (!group) {
    return (
      <div className="flex items-center justify-center h-full">
        <div>Group not found</div>
      </div>
    );
  }
  
  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{
        background: cssVar(CSS_VARS.gray50),
      }}
    >
      {/* Two-section layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Section - Header + Chat List */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: 'calc(66.67% - 94px)',
            marginLeft: '132px',
            marginRight: '32px',
          }}
        >
          {/* Header */}
          <GroupDetailHeader
            group={group}
            onRename={handleRename}
            onStar={handleStar}
            selectedCount={selectedChats.size}
            totalCount={filteredConversations.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            isIndeterminate={isIndeterminate}
            isAllSelected={isAllSelected}
            onDeleteClick={handleDelete}
            onArchiveClick={handleArchive}
            onUnGroupClick={handleUnGroup}
            onArchiveGroup={handleArchiveGroup}
            onDeleteGroup={handleDeleteGroup}
          />
          
          {/* Chat List */}
          <GroupChatList
            conversations={filteredConversations}
            selectedConversations={selectedChats}
            onSelectConversation={handleSelectChat}
            onConversationClick={handleConversationClick}
            onPinClick={handlePinIconClick}
            groupId={group.id}
            selectedChatForPins={selectedChatForPins}
          />
        </div>
        
        {/* Right Section - Pinned Items */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: '558px',
            marginRight: '24px',
            flexShrink: 0,
          }}
        >
          <GroupPinnedItemsPanel
            conversationIds={group.conversationIds}
            filteredConversationId={selectedChatForPins}
          />
        </div>
      </div>
      
      {/* Modals */}
      <RenameGroupModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        group={group}
        mode="rename"
        onRenameComplete={() => setIsRenameModalOpen(false)}
      />
      
      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        groups={[group]}
        onDeleteComplete={() => {
          setIsDeleteModalOpen(false);
          router.push('/groups');
        }}
      />
    </div>
  );
}


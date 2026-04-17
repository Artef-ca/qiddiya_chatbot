'use client';

import { useState, useMemo } from 'react';
import GroupsPageHeader from './GroupsPageHeader';
import GroupList from './GroupList';
import RenameGroupModal from './RenameGroupModal';
import DeleteGroupModal from './DeleteGroupModal';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { cn } from '@/lib/utils';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { addToast } from '@/store/slices/uiSlice';
import { useAppDispatch } from '@/store/hooks';

export default function GroupListingPage() {
  const dispatch = useAppDispatch();
  const { conversations, isLoading: isLoadingConversations } = useConversations();
  const { groups: apiGroups, isLoading: isLoadingGroups, updateGroup } = useGroups();
  // Ensure pinned items are fetched and Redux hydrated so group pin counts show correctly
  usePinnedItems();
  const isLoading = isLoadingConversations || isLoadingGroups;
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'starred' | 'archived'>('active');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);

  const handleFilterChange = (nextFilter: 'active' | 'starred' | 'archived') => {
    if (nextFilter === filter) return;
    setSelectedGroups(new Set());
    setFilter(nextFilter);
  };

  // Filter groups based on search and filter
  const filteredGroups = useMemo(() => {
    return apiGroups.filter((group) => {
      // Apply filter
      if (filter === 'starred') {
        // Show only starred groups
        if (!group.starred || group.archived) return false;
      } else if (filter === 'archived') {
        // Show only archived groups
        if (!group.archived) return false;
      } else if (filter === 'active') {
        // Show only non-archived groups
        if (group.archived) return false;
      }
      
      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return group.name.toLowerCase().includes(query);
      }
      
      return true;
    });
  }, [apiGroups, filter, searchQuery]);

  const handleDeleteConfirm = () => {
    // Clear selection after delete
    setSelectedGroups(new Set());
    setIsDeleteModalOpen(false);
  };

  const handleBulkArchiveStatusChange = async (archived: boolean) => {
    if (selectedGroups.size === 0) return;

    const groupsToUpdate = filteredGroups.filter((g) => selectedGroups.has(g.id));
    const count = groupsToUpdate.length;

    try {
      await Promise.all(
        groupsToUpdate.map((group) =>
          updateGroup({
            groupId: group.id,
            updates: { archived },
          })
        )
      );

      const actionLabel = archived ? 'archived' : 'unarchived';
      const message =
        count === 1
          ? `1 group was successfully ${actionLabel}`
          : `${count} groups were successfully ${actionLabel}`;

      dispatch(
        addToast({
          type: 'success',
          message,
          duration: 5000,
        })
      );

      // Clear selection
      setSelectedGroups(new Set());
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: archived
            ? 'Something went wrong! We weren\'t able to archive the groups. Please try again later.'
            : 'Something went wrong! We weren\'t able to unarchive the groups. Please try again later.',
        })
      );
    }
  };

  const handleArchive = async () => {
    await handleBulkArchiveStatusChange(true);
  };

  const handleUnarchive = async () => {
    await handleBulkArchiveStatusChange(false);
  };

  const handleNewGroup = () => {
    setIsNewGroupModalOpen(true);
  };

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
      <GroupsPageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={handleFilterChange}
        selectedCount={selectedGroups.size}
        totalCount={filteredGroups.length}
        onSelectAll={() => {
          setSelectedGroups(new Set(filteredGroups.map(g => g.id)));
        }}
        onDeselectAll={() => {
          setSelectedGroups(new Set());
        }}
        onDeleteClick={() => {
          if (selectedGroups.size > 0) {
            setIsDeleteModalOpen(true);
          }
        }}
        onArchiveClick={handleArchive}
        onUnarchiveClick={handleUnarchive}
        onNewGroupClick={handleNewGroup}
      />
      
      <GroupList
        groups={filteredGroups}
        selectedGroups={selectedGroups}
        filter={filter}
        onCreateGroup={handleNewGroup}
        onSelectGroup={(id) => {
          setSelectedGroups(prev => {
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
        conversations={conversations}
      />

      {/* New Group Modal */}
      <RenameGroupModal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        group={null}
        mode="create"
        onCreateComplete={() => {
          setIsNewGroupModalOpen(false);
        }}
      />

      {/* Delete Group Modal */}
      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        groups={filteredGroups.filter((g) => selectedGroups.has(g.id))}
        onDeleteComplete={handleDeleteConfirm}
      />
    </div>
  );
}


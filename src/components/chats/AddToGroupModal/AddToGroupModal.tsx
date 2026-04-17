'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Check, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import type { Conversation } from '@/types';
import Image from 'next/image';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button-enhanced';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { GroupList } from './GroupList';
import { CreateNewGroupOption } from './CreateNewGroupOption';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
}

interface AddToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  groups: Group[];
  onAddComplete?: () => void;
}

export default function AddToGroupModal({
  isOpen,
  onClose,
  conversations,
  groups,
  onAddComplete,
}: AddToGroupModalProps) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { groups: allGroups, isLoading } = useConversations();
  const { createGroup, addConversationsToGroup } = useGroups();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [currentGroups, setCurrentGroups] = useState<Group[]>(groups);
  const justAddedGroupRef = useRef<string | null>(null);

  // Update currentGroups when groups prop changes
  useEffect(() => {
    if (!isOpen) return;

    setCurrentGroups((prevGroups) => {
      if (justAddedGroupRef.current) {
        const newGroupExists = groups.some((g) => g.id === justAddedGroupRef.current);
        if (newGroupExists && groups.length > 0) {
          const groupMap = new Map(prevGroups.map((g) => [g.id, g]));
          groups.forEach((group) => {
            groupMap.set(group.id, group);
          });
          const mergedGroups = Array.from(groupMap.values());
          justAddedGroupRef.current = null;
          return mergedGroups;
        }
        return prevGroups;
      }

      if (prevGroups.length === 0 && groups.length > 0) {
        return groups;
      } else if (prevGroups.length > 0) {
        const groupMap = new Map(prevGroups.map((g) => [g.id, g]));
        if (groups.length > 0) {
          groups.forEach((group) => {
            groupMap.set(group.id, group);
          });
          return Array.from(groupMap.values());
        }
        return prevGroups;
      }

      return prevGroups;
    });
  }, [groups, isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentGroups((prevGroups) => {
        if (prevGroups.length === 0 && groups.length > 0) {
          return groups;
        }
        return prevGroups;
      });
      setSearchQuery('');
      justAddedGroupRef.current = null;
      setSelectedGroupId(null);
      setIsCreatingNew(false);
    }
  }, [isOpen]);

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return currentGroups;
    }
    const query = searchQuery.toLowerCase().trim();
    return currentGroups.filter((group) => group.name.toLowerCase().includes(query));
  }, [currentGroups, searchQuery]);

  // Check if search query matches any existing group
  const hasMatchingGroup = filteredGroups.length > 0;
  const shouldShowCreateNew = searchQuery.trim() && !hasMatchingGroup;

  // Get selected group name for display
  const selectedGroup = selectedGroupId
    ? currentGroups.find((g) => g.id === selectedGroupId)
    : null;

  const handleGroupSelect = (groupId: string) => {
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    } else {
      setSelectedGroupId(groupId);
    }
    setIsCreatingNew(false);
  };

  const handleCreateNewGroup = async () => {
    const groupName = searchQuery.trim();
    if (!groupName) return;

    setIsSubmitting(true);
    try {
      const newGroup = await createGroup(groupName);

      if (conversations.length > 0) {
        const conversationIds = conversations.map((c) => c.id);
        try {
          await addConversationsToGroup({
            groupId: newGroup.id,
            conversationIds,
          });
        } catch (addError) {
          console.warn('Failed to add conversations to new group:', addError);
        }
      }

      const existingGroupIds = new Set(currentGroups.map((g) => g.id));
      if (!existingGroupIds.has(newGroup.id)) {
        const updatedGroups = [...currentGroups, newGroup];
        setCurrentGroups(updatedGroups);
      }

      justAddedGroupRef.current = newGroup.id;
      setSearchQuery('');
      setSelectedGroupId(newGroup.id);
      setIsCreatingNew(false);

      dispatch(
        addToast({
          type: 'success',
          message: `**${groupName}** was successfully created`,
        })
      );
    } catch (error) {
      console.error('Error creating group:', error);
      dispatch(
        addToast({
          type: 'error',
          message: 'Something went wrong! We weren\'t able to create the group. Please try again later.',
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedGroupId) {
      return;
    }

    setIsSubmitting(true);

    try {
      const conversationIds = conversations.map((c) => c.id);
      const groupName = selectedGroup?.name || '';

      await addConversationsToGroup({
        groupId: selectedGroupId,
        conversationIds,
      });

      const count = conversations.length;
      const chatName = count === 1 ? conversations[0]?.title || 'Chat' : `${count} chats`;
      dispatch(
        addToast({
          type: 'success',
          message: `**${chatName}** was successfully added to **${groupName}** group`,
        })
      );

      onAddComplete?.();
      onClose();
    } catch (error) {
      const errorMessage =
        'Something went wrong! We weren\'t able to add Chat to selected group. Please try again later.';
      dispatch(
        addToast({
          type: 'error',
          message: errorMessage,
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSearchQuery('');
    setSelectedGroupId(null);
    setIsCreatingNew(false);
    onClose();
  };

  const canAdd = selectedGroupId !== null;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <ModalHeader>Add to Group</ModalHeader>

      <ModalContent>
        {/* Search Input and Group List Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.md,
            height: '342px',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.xl,
            background:
              'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)',
          }}
        >
          {/* Search Input */}
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedGroupId(null);
              setIsCreatingNew(false);
            }}
            placeholder="group name"
            autoFocus
            icon={<Search size={20} style={{ color: cssVar(CSS_VARS.textSecondary) }} />}
            disabled={isSubmitting}
          />

          {/* Group List or Create New Option */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {!searchQuery.trim() && filteredGroups.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: theme.spacing.md,
                  color: cssVar(CSS_VARS.textMuted),
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: theme.typography.text.base.size,
                  fontWeight: theme.typography.weights.regular.value,
                }}
              >
                No groups available
              </div>
            ) : shouldShowCreateNew ? (
              <CreateNewGroupOption
                searchQuery={searchQuery}
                onCreateNew={handleCreateNewGroup}
                isSubmitting={isSubmitting}
              />
            ) : filteredGroups.length > 0 ? (
              <GroupList
                groups={filteredGroups}
                selectedGroupId={selectedGroupId}
                onGroupSelect={handleGroupSelect}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: theme.spacing.md,
                  color: cssVar(CSS_VARS.textMuted),
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: theme.typography.text.base.size,
                  fontWeight: theme.typography.weights.regular.value,
                }}
              >
                No groups found
              </div>
            )}
          </div>
        </div>
      </ModalContent>

      <ModalFooter>
        <Button variant="text" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAdd}
          disabled={!canAdd || isSubmitting}
          icon={
            <Image
              src="/AddToGroup.svg"
              alt="Add"
              width={16}
              height={16}
              style={{
                flexShrink: 0,
                filter: canAdd ? 'brightness(0) invert(1)' : 'none',
                opacity: canAdd ? 1 : 0.5,
              }}
            />
          }
        >
          Add
        </Button>
      </ModalFooter>
    </Modal>
  );
}


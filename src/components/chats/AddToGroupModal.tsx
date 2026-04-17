'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import type { Conversation } from '@/types';
import Image from 'next/image';

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
  // Modal is always in 'add' mode - remove functionality is handled directly in ChatListItem
  const modalMode = 'add' as const;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [currentGroups, setCurrentGroups] = useState<Group[]>(groups);
  const justAddedGroupRef = useRef<string | null>(null);

  // Modal is always in 'add' mode, so no need to find current group

  // Update currentGroups when groups prop changes (but preserve during refetch)
  useEffect(() => {
    if (!isOpen) return;
    
    setCurrentGroups(prevGroups => {
      // Skip update if we just added a group (to prevent flickering during refetch)
      if (justAddedGroupRef.current) {
        // Check if the newly added group is now in the groups list
        const newGroupExists = groups.some(g => g.id === justAddedGroupRef.current);
        if (newGroupExists && groups.length > 0) {
          // Group is now in the list, merge with prevGroups to preserve all groups
          const groupMap = new Map(prevGroups.map(g => [g.id, g]));
          
          // Update with refetched groups (ensures we have latest data)
          groups.forEach(group => {
            groupMap.set(group.id, group);
          });
          
          const mergedGroups = Array.from(groupMap.values());
          justAddedGroupRef.current = null;
          return mergedGroups;
        }
        // If group not found yet or groups is empty, keep prevGroups (refetch still in progress)
        return prevGroups;
      }
      
      // Always merge groups to preserve existing groups and prevent flickering
      // This ensures we never lose groups during refetch
      if (prevGroups.length === 0 && groups.length > 0) {
        // Initial load - set groups
        return groups;
      } else if (prevGroups.length > 0) {
        // Merge: preserve existing groups, add/update with new ones from prop
        // This ensures we never clear groups during refetch, even if groups prop is temporarily empty
        const groupMap = new Map(prevGroups.map(g => [g.id, g]));
        
        // Only update if groups prop has data (don't clear if it's empty during refetch)
        if (groups.length > 0) {
          groups.forEach(group => {
            groupMap.set(group.id, group);
          });
          
          const mergedGroups = Array.from(groupMap.values());
          return mergedGroups;
        }
        // If groups is empty but prevGroups has data, don't clear it (likely a refetch in progress)
        return prevGroups;
      }
      
      return prevGroups;
    });
  }, [groups, isOpen]);

  // Reset state when modal opens (only on initial open, not when groups prop changes)
  useEffect(() => {
    if (isOpen) {
      // Initialize currentGroups from groups prop only if currentGroups is empty
      // This prevents resetting during refetch
      setCurrentGroups(prevGroups => {
        if (prevGroups.length === 0 && groups.length > 0) {
          return groups;
        }
        return prevGroups; // Preserve existing groups
      });
      
      setSearchQuery('');
      justAddedGroupRef.current = null; // Reset ref when modal opens
      setSelectedGroupId(null);
      setIsCreatingNew(false);
    }
  }, [isOpen]); // Removed 'groups' dependency to prevent reset during refetch

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
    // Toggle selection - if clicking the same group, unselect it
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
      // Create the group immediately
      const newGroup = await createGroup(groupName);
      
      // Add conversations to the newly created group (if any)
      if (conversations.length > 0) {
        const conversationIds = conversations.map((c) => c.id);
        try {
          await addConversationsToGroup({
            groupId: newGroup.id,
            conversationIds,
          });
        } catch (addError) {
          // If adding conversations fails, log but don't fail the whole operation
          // The group was created successfully
          console.warn('Failed to add conversations to new group:', addError);
        }
      }

      // Update current groups list immediately with the new group (optimistic update)
      // Merge with existing groups to preserve all groups and prevent flickering
      const existingGroupIds = new Set(currentGroups.map(g => g.id));
      if (!existingGroupIds.has(newGroup.id)) {
        const updatedGroups = [...currentGroups, newGroup];
        setCurrentGroups(updatedGroups);
      }
      
      // Mark that we just added a group (to prevent flickering during refetch)
      justAddedGroupRef.current = newGroup.id;

      // Clear search query to show all groups
      setSearchQuery('');
      
      // Select the newly created group immediately
      setSelectedGroupId(newGroup.id);
      setIsCreatingNew(false);
      
      // Show success notification immediately
      dispatch(addToast({
        type: 'success',
        message: `**${groupName}** was successfully created`,
      }));
      
      // Don't invalidate query immediately - the mutation's onSuccess already handles this
      // This prevents the flickering issue. The groups will be updated when the query refetches
      // but we've already optimistically updated the UI, so it won't flicker
    } catch (error) {
      console.error('Error creating group:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to create the group. Please try again later.',
      }));
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

      // Add conversations to existing group
      await addConversationsToGroup({
        groupId: selectedGroupId,
        conversationIds,
      });

      // Added to group notification
      const count = conversations.length;
      const chatName = count === 1 ? conversations[0]?.title || 'Chat' : `${count} chats`;
      dispatch(addToast({
        type: 'success',
        message: `**${chatName}** was successfully added to **${groupName}** group`,
      }));

      onAddComplete?.();
      onClose();
    } catch (error) {
      // Show error notification
      const errorMessage = 'Something went wrong! We weren\'t able to add Chat to selected group. Please try again later.';
      dispatch(addToast({
        type: 'error',
        message: errorMessage,
      }));
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

  // Don't render if modal is closed
  if (!isOpen) return null;

  const canAdd = selectedGroupId !== null;

  // Render modal using portal at document body level
  const modalContent = (
    <>
      {/* Blurred Background Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(99, 102, 241, 0.08)', // Soft blue tint matching Figma
        }}
        onClick={handleCancel}
      />

      {/* Modal Dialog - centered vertically and horizontally */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          pointerEvents: 'none',
        }}
        onClick={handleCancel}
      >
        <div
          style={{
            background: '#F6F7F9', // Lynch-50
            border: '1px solid #ECEEF2', // Lynch-100
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0px 8px 16px 0px #ECEEF2', // Lynch-100
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            overflowY: 'auto',
            overflowX: 'hidden',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* Title */}
            <h3
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: '32px',
                letterSpacing: '-0.12px',
                color: '#343A46', // Lynch-900
                margin: 0,
                paddingBottom: '10px',
              }}
            >
              Add to Group
            </h3>

            {/* Search Input and Group List Container */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                height: '342px',
                padding: '16px',
                borderRadius: '24px',
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)',
              }}
            >
              {/* Search Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid #D5D9E2', // Lynch-200
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxShadow: '0px 1px 4px 0px #ECEEF2', // Lynch-100
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <Search size={20} style={{ color: '#64748B', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedGroupId(null);
                      setIsCreatingNew(false);
                    }}
                    placeholder="group name"
                    autoFocus
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 400,
                      lineHeight: '24px',
                      color: searchQuery ? '#343A46' : '#8695AA', // Lynch-900 or Lynch-400
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      flex: 1,
                      minWidth: 0,
                    }}
                  />
                </div>
              </div>

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
                  // Empty state when no groups exist
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      color: '#8695AA', // Lynch-400
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 400,
                    }}
                  >
                    No groups available
                  </div>
                ) : shouldShowCreateNew ? (
                  // Show "Create New Group" option
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      minHeight: '40px',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '16px',
                        fontWeight: 400,
                        lineHeight: '24px',
                        color: '#343A46', // Lynch-900
                        margin: 0,
                      }}
                    >
                      There&apos;s no group called &quot;
                      <span style={{ fontWeight: 500 }}>{searchQuery}</span>&quot;
                    </p>
                    <button
                      onClick={handleCreateNewGroup}
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Plus size={20} style={{ color: '#7122F4' }} />
                      <span
                        style={{
                          fontFamily: 'Manrope, var(--font-manrope)',
                          fontSize: '16px',
                          fontWeight: 600,
                          lineHeight: '24px',
                          color: '#7122F4', // Electric-Violet-600
                        }}
                      >
                        Add &quot;{searchQuery}&quot; as a new group
                      </span>
                    </button>
                  </div>
                ) : filteredGroups.length > 0 ? (
                  // Show group list
                  filteredGroups.map((group) => {
                    const isSelected = selectedGroupId === group.id;
                    return (
                      <div
                        key={group.id}
                        onClick={() => handleGroupSelect(group.id)}
                        style={{
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          minHeight: '40px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(113, 34, 244, 0.05)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'rgba(113, 34, 244, 0.02)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontFamily: 'Manrope, var(--font-manrope)',
                            fontSize: '16px',
                            fontWeight: 500,
                            lineHeight: '24px',
                            color: '#343A46', // Lynch-900
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {group.name}
                        </span>
                        {isSelected && (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Check size={24} style={{ color: '#3E8FFF' }} />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // Empty state when no groups match
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      color: '#8695AA', // Lynch-400
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 400,
                    }}
                  >
                    No groups found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              {/* Cancel Button */}
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: '#434E61', // Lynch-700
                  opacity: isSubmitting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>

              {/* Add Button */}
              <button
                onClick={handleAdd}
                disabled={!canAdd || isSubmitting}
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: canAdd ? '#7122F4' : '#CFCFD2', // Electric-Violet-600 or Jumbo-200
                  background: canAdd ? '#7122F4' : '#E6E6E7', // Electric-Violet-600 or Jumbo-100
                  boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                  cursor: (canAdd && !isSubmitting) ? 'pointer' : 'not-allowed',
                  opacity: (canAdd && !isSubmitting) ? 1 : 0.5,
                }}
              >
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
                <span
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '13px',
                    fontWeight: 700,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: canAdd ? '#F5F2FF' : '#84848C', // Electric-Violet-50 or Jumbo-400
                  }}
                >
                  Add
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Use portal to render at document body level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}


'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGroups } from '@/hooks/useGroups';
import { useConversations } from '@/hooks/useConversations';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { deleteConversation } from '@/store/slices/chatSlice';
import { removePinnedItem } from '@/store/slices/pinnedSlice';
import { addToast } from '@/store/slices/uiSlice';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
  starred?: boolean;
  archived?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onDeleteComplete?: () => void;
}

export default function DeleteGroupModal({
  isOpen,
  onClose,
  groups,
  onDeleteComplete,
}: DeleteGroupModalProps) {
  const dispatch = useAppDispatch();
  const { deleteGroup } = useGroups();
  const { deleteConversationAsync } = useConversations();
  const { deletePinnedItem } = usePinnedItems();
  const pinnedItems = useAppSelector((state) => state.pinned.items);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDeleteChatsAndPinsConfirmed, setIsDeleteChatsAndPinsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset confirmation when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
      setIsDeleteChatsAndPinsConfirmed(false);
    }
  }, [isOpen]);

  // Don't render if modal is closed
  if (!isOpen) return null;

  const isMultiple = groups.length > 1;
  const groupNames = groups.map(g => g.name);

  // Calculate total conversations in all groups
  const allConversationIds = groups.flatMap(group => group.conversationIds);
  const totalChats = allConversationIds.length;

  // Calculate total pinned items for conversations in these groups
  const totalPinnedItems = pinnedItems.filter((item) =>
    allConversationIds.includes(item.conversationId)
  ).length;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsSubmitting(true);
    
    try {
      // Collect all conversation IDs from all groups (already calculated above, but recalculate for safety)
      const allConversationIds = groups.flatMap(group => group.conversationIds);
      
      // If second checkbox is checked, delete conversations and pinned items
      if (isDeleteChatsAndPinsConfirmed) {
        // Delete conversations
        for (const conversationId of allConversationIds) {
          try {
            await deleteConversationAsync(conversationId);
            dispatch(deleteConversation(conversationId));
          } catch (error) {
            console.error('Failed to delete conversation:', conversationId, error);
          }
        }

        // Delete pinned items for these conversations
        const pinnedItemsToDelete = pinnedItems.filter((item) =>
          allConversationIds.includes(item.conversationId)
        );

        for (const pinnedItem of pinnedItemsToDelete) {
          try {
            await new Promise<void>((resolve) => {
              deletePinnedItem(pinnedItem.id, {
                onSuccess: () => {
                  dispatch(removePinnedItem(pinnedItem.id));
                  resolve();
                },
                onError: (error) => {
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
                    dispatch(removePinnedItem(pinnedItem.id));
                    resolve();
                  } else {
                    console.error('Failed to delete pinned item:', error);
                    dispatch(removePinnedItem(pinnedItem.id));
                    resolve();
                  }
                },
              });
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('not found') && !errorMessage.includes('404')) {
              console.error('Failed to delete pinned item:', error);
            }
            dispatch(removePinnedItem(pinnedItem.id));
          }
        }
      }

      // Delete all groups
      // Note: When a group is deleted, conversations remain but are removed from the group
      // Only if the second checkbox is checked, conversations and pinned items are also deleted
      await Promise.all(
        groups.map(group => deleteGroup(group.id))
      );

      // Show success notification
      let message: string;
      if (isDeleteChatsAndPinsConfirmed) {
        // Both group and conversations/pinned items were deleted
        message = groups.length === 1
          ? `${groups[0].name} was successfully deleted along with its chats and pinned messages`
          : `${groups.length} groups were successfully deleted along with their chats and pinned messages`;
      } else {
        // Only group was deleted, conversations remain (just removed from group)
        message = groups.length === 1
          ? `${groups[0].name} was successfully deleted. The chats in this group have been removed from the group but remain available.`
          : `${groups.length} groups were successfully deleted. The chats in these groups have been removed from the groups but remain available.`;
      }

      dispatch(addToast({
        type: 'success',
        message,
      }));

      onDeleteComplete?.();
      onClose();
    } catch {
      // Show error notification
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to delete the group(s). Please try again later.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsConfirmed(false);
    setIsDeleteChatsAndPinsConfirmed(false);
    onClose();
  };

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
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
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
            border: '1px solid #FDE7E3', // Punch-100
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
              Delete Group
            </h3>

            {/* Message */}
            <div
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '24px',
                color: '#343A46', // Lynch-900
                paddingBottom: '16px',
              }}
            >
              <span>
                {isMultiple 
                  ? `Are you sure you want to delete...(${groups.length})?:`
                  : 'Are you sure you want to delete...?'}
                <br />
              </span>
              <span style={{ fontWeight: 700 }}>
                {isMultiple ? (
                  <>
                    {groupNames.map((name, index) => (
                      <span key={index}>
                        - {name}
                        {index < groupNames.length - 1 && <br />}
                      </span>
                    ))}
                  </>
                ) : (
                  groupNames[0]
                )}
                <br />
                <br />
              </span>
              <span style={{ color: '#D64933' }}>This action is not reversible.</span>
            </div>

            {/* First Checkbox - Confirm delete group */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '4px',
                }}
                onClick={() => setIsConfirmed(!isConfirmed)}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: `1px solid ${isConfirmed ? '#8955FD' : '#8695AA'}`,
                    background: isConfirmed ? '#8955FD' : 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {isConfirmed && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="#F6F7F9"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingTop: '2px',
                  flex: 1,
                }}
                onClick={() => setIsConfirmed(!isConfirmed)}
              >
                <p
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: '#434E61', // Lynch-700
                    margin: 0,
                    cursor: 'pointer',
                  }}
                >
                  I confirm my request to delete this group
                </p>
              </div>
            </div>

            {/* Second Checkbox - Confirm delete chats and pinned messages */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '4px',
                }}
                onClick={() => setIsDeleteChatsAndPinsConfirmed(!isDeleteChatsAndPinsConfirmed)}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: `1px solid ${isDeleteChatsAndPinsConfirmed ? '#8955FD' : '#8695AA'}`,
                    background: isDeleteChatsAndPinsConfirmed ? '#8955FD' : 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {isDeleteChatsAndPinsConfirmed && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="#F6F7F9"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingTop: '2px',
                  flex: 1,
                }}
                onClick={() => setIsDeleteChatsAndPinsConfirmed(!isDeleteChatsAndPinsConfirmed)}
              >
                <p
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: '#434E61', // Lynch-700
                    margin: 0,
                    cursor: 'pointer',
                  }}
                >
                  Delete Chats({totalChats}) & Pinned Items({totalPinnedItems}) as well
                </p>
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
                  boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
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

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                disabled={!isConfirmed || isSubmitting}
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #D64933', // Punch-600
                  background: '#D64933', // Punch-600
                  boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                  cursor: (!isConfirmed || isSubmitting) ? 'not-allowed' : 'pointer',
                  opacity: (!isConfirmed || isSubmitting) ? 0.5 : 1,
                }}
                title={!isConfirmed ? 'Please confirm deletion by checking the first checkbox' : ''}
              >
                <Trash2 size={16} style={{ color: '#F5F2FF' }} />
                <span
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '13px',
                    fontWeight: 700,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: '#F5F2FF', // Electric-Violet-50
                  }}
                >
                  Delete
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


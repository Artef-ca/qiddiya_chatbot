'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { deleteConversation } from '@/store/slices/chatSlice';
import { removePinnedItem } from '@/store/slices/pinnedSlice';
import { useConversations } from '@/hooks/useConversations';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { addToast } from '@/store/slices/uiSlice';
import type { Conversation } from '@/types';

interface DeleteChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationsToDelete: Conversation[];
  onDeleteComplete?: () => void;
}

export default function DeleteChatModal({
  isOpen,
  onClose,
  conversationsToDelete,
  onDeleteComplete,
}: DeleteChatModalProps) {
  const dispatch = useAppDispatch();
  const { deleteConversationAsync } = useConversations();
  const { deletePinnedItem } = usePinnedItems();
  const pinnedItems = useAppSelector((state) => state.pinned.items);
  const [keepPinnedItems, setKeepPinnedItems] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const count = conversationsToDelete.length;
  const conversationIds = conversationsToDelete.map((c) => c.id);

  // Calculate total pinned items from all selected conversations
  // Must be called before any conditional returns to follow Rules of Hooks
  const totalPinnedItems = useMemo(() => {
    if (count === 0) return 0;
    return pinnedItems.filter((item) => conversationIds.includes(item.conversationId)).length;
  }, [pinnedItems, conversationIds, count]);

  // Determine which scenario to show
  const isSingleChat = count === 1;
  const isMultipleSmall = count >= 2 && count < 5;

  // Don't render if modal is closed or no conversations to delete
  if (!isOpen || count === 0) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      // Delete conversations
      for (const conversation of conversationsToDelete) {
        try {
          await deleteConversationAsync(conversation.id);
          dispatch(deleteConversation(conversation.id));
        } catch (error) {
          // If one fails, continue with others but show error at the end
          console.error('Failed to delete conversation:', conversation.id, error);
        }
      }

    // Handle pinned items based on checkbox state
    if (!keepPinnedItems) {
      // Delete all pinned items from the conversations being deleted
      const pinnedItemsToDelete = pinnedItems.filter((item) =>
        conversationIds.includes(item.conversationId)
      );
      
      for (const pinnedItem of pinnedItemsToDelete) {
        try {
          // Use deletePinnedItem which is a mutate function, wrap in promise
          await new Promise<void>((resolve) => {
            deletePinnedItem(pinnedItem.id, {
              onSuccess: () => {
                dispatch(removePinnedItem(pinnedItem.id));
                resolve();
              },
              onError: (error) => {
                // If item is not found, it's already deleted - just remove from Redux
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('not found') || errorMessage.includes('404')) {
                  // Item already deleted or doesn't exist - just remove from Redux state
                  dispatch(removePinnedItem(pinnedItem.id));
                  resolve();
                } else {
                  // For other errors, log but still remove from Redux to keep UI in sync
                  console.error('Failed to delete pinned item:', error);
                  dispatch(removePinnedItem(pinnedItem.id));
                  resolve();
                }
              },
            });
          });
        } catch (error) {
          // Catch any unexpected errors and still remove from Redux
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('not found') && !errorMessage.includes('404')) {
            console.error('Failed to delete pinned item:', error);
          }
          // Always remove from Redux state to keep UI in sync
          dispatch(removePinnedItem(pinnedItem.id));
        }
      }
    }
    // If keepPinnedItems is true, pinned items remain in the pinned board

      // Show success notification
      const count = conversationsToDelete.length;
      let message: string;
      
      if (count === 1) {
        // Single chat: "name-of-chat was successfully deleted" (name in bold)
        const chatName = conversationsToDelete[0]?.title || 'Chat';
        message = `**${chatName}** was successfully deleted`;
      } else {
        // Multiple chats: "2 chats were successfully deleted" (count and "chats" in bold)
        message = `**${count} chats** were successfully deleted`;
      }
      
      dispatch(addToast({
        type: 'success',
        message,
      }));

      setKeepPinnedItems(true); // Reset to default
      onDeleteComplete?.();
      onClose();
    } catch {
      // Show error notification
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to delete the selected Chat(s). Please try again later.',
      }));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setKeepPinnedItems(true); // Reset to default
    onClose();
  };

  // Render modal using portal at document body level to avoid stacking context issues
  const modalContent = (
    <>
      {/* Blurred Background Overlay - covers entire screen including sidebar, chat input, and scroll button */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(99, 102, 241, 0.08)', // Soft blue tint matching AddToGroupModal
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
          pointerEvents: 'none', // Allow clicks to pass through to overlay
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
            maxHeight: '90vh', // Ensure modal doesn't exceed viewport height
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            overflowY: 'auto', // Allow vertical scrolling if content is too long
            overflowX: 'hidden',
            pointerEvents: 'auto', // Re-enable pointer events for modal content
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              Delete Chat
            </h3>

            {/* Message Content */}
            <div style={{ paddingBottom: '16px' }}>
              {isSingleChat ? (
                <div>
                  <p
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '24px',
                      color: '#343A46', // Lynch-900
                      margin: 0,
                    }}
                  >
                    Are you sure you want to delete:
                  </p>
                  <p
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 700,
                      lineHeight: '24px',
                      color: '#343A46', // Lynch-900
                      margin: '4px 0 0 0',
                    }}
                  >
                    {conversationsToDelete[0]?.title}?
                  </p>
                </div>
              ) : isMultipleSmall ? (
                <div>
                  <p
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '24px',
                      color: '#343A46', // Lynch-900
                      margin: 0,
                      marginBottom: '8px',
                    }}
                  >
                    Are you sure you want to delete... ({count})?
                  </p>
                  <div style={{ marginTop: '8px' }}>
                    {conversationsToDelete.map((conv) => (
                      <p
                        key={conv.id}
                        style={{
                          fontFamily: 'Manrope, var(--font-manrope)',
                          fontSize: '16px',
                          fontWeight: 700,
                          lineHeight: '24px',
                          color: '#343A46', // Lynch-900
                          margin: '4px 0',
                        }}
                      >
                        - {conv.title}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '24px',
                      color: '#343A46', // Lynch-900
                      margin: 0,
                      marginBottom: '8px',
                    }}
                  >
                    Are you sure you want to delete all{' '}
                    <span style={{ fontWeight: 600 }}>{count} chats</span>?
                  </p>
                  <p
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 600,
                      lineHeight: '24px',
                      color: '#D64933', // Punch-600
                      margin: '8px 0 0 0',
                    }}
                  >
                    This action is not reversible.
                  </p>
                </div>
              )}
            </div>

            {/* Checkbox */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '4px',
                }}
              >
                <div
                  onClick={() => setKeepPinnedItems(!keepPinnedItems)}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: `1px solid ${keepPinnedItems ? '#8955FD' : '#9CA3AF'}`,
                    background: keepPinnedItems ? '#8955FD' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {keepPinnedItems && (
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
                  paddingTop: '0',
                  width: '320px',
                }}
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
                    paddingBottom: '2px',
                  }}
                >
                  Keep pinned items ({totalPinnedItems})
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
                  cursor: 'pointer',
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: '#434E61', // Lynch-700
                }}
              >
                Cancel
              </button>

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
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
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.5 : 1,
                }}
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

  // Use portal to render at document body level, ensuring it's above all other elements
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
}


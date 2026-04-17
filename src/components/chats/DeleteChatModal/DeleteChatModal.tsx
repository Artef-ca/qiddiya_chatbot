'use client';

import { useState, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { deleteConversation } from '@/store/slices/chatSlice';
import { removePinnedItem } from '@/store/slices/pinnedSlice';
import { useConversations } from '@/hooks/useConversations';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { addToast } from '@/store/slices/uiSlice';
import type { Conversation } from '@/types';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button-enhanced';
import { DeleteChatContent } from './DeleteChatContent';

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
  const totalPinnedItems = useMemo(() => {
    if (count === 0) return 0;
    return pinnedItems.filter((item) => conversationIds.includes(item.conversationId)).length;
  }, [pinnedItems, conversationIds, count]);

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
          console.error('Failed to delete conversation:', conversation.id, error);
        }
      }

      // Handle pinned items based on checkbox state
      if (!keepPinnedItems) {
        const pinnedItemsToDelete = pinnedItems.filter((item) =>
          conversationIds.includes(item.conversationId)
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

      // Show success notification
      let message: string;
      if (count === 1) {
        const chatName = conversationsToDelete[0]?.title || 'Chat';
        message = `**${chatName}** was successfully deleted`;
      } else {
        message = `**${count} chats** were successfully deleted`;
      }

      dispatch(
        addToast({
          type: 'success',
          message,
        })
      );

      setKeepPinnedItems(true);
      onDeleteComplete?.();
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message:
            'Something went wrong! We weren\'t able to delete the selected Chat(s). Please try again later.',
        })
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setKeepPinnedItems(true);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} variant="danger">
      <ModalHeader>Delete Chat</ModalHeader>

      <ModalContent>
        <DeleteChatContent conversationsToDelete={conversationsToDelete} count={count} />

        {/* Checkbox */}
        <Checkbox
          checked={keepPinnedItems}
          onChange={(e) => setKeepPinnedItems(e.target.checked)}
          label={`Keep pinned items (${totalPinnedItems})`}
        />
      </ModalContent>

      <ModalFooter>
        <Button variant="text" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={isDeleting} icon={<Trash2 size={16} />}>
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
}


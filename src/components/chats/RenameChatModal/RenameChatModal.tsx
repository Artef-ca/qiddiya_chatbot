'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { updateConversationTitle } from '@/store/slices/chatSlice';
import { useConversations } from '@/hooks/useConversations';
import { addToast } from '@/store/slices/uiSlice';
import type { Conversation } from '@/types';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button-enhanced';

interface RenameChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onRenameComplete?: () => void;
}

export default function RenameChatModal({
  isOpen,
  onClose,
  conversation,
  onRenameComplete,
}: RenameChatModalProps) {
  const dispatch = useAppDispatch();
  const { updateConversationAsync } = useConversations();
  const [renameValue, setRenameValue] = useState(conversation?.title || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update rename value when conversation changes
  useEffect(() => {
    if (conversation) {
      setRenameValue(conversation.title);
    }
  }, [conversation]);

  // Don't render if modal is closed or no conversation
  if (!isOpen || !conversation) return null;

  const handleSave = async () => {
    const trimmedValue = renameValue.trim();

    // Validate input
    if (!trimmedValue) {
      dispatch(
        addToast({
          type: 'error',
          message: 'Chat name cannot be empty',
        })
      );
      return;
    }

    // If name hasn't changed, just close
    if (trimmedValue === conversation.title) {
      onClose();
      return;
    }

    setIsSubmitting(true);

    try {
      await updateConversationAsync({
        id: conversation.id,
        updates: { title: trimmedValue },
      });

      dispatch(updateConversationTitle({ id: conversation.id, title: trimmedValue }));

      dispatch(
        addToast({
          type: 'success',
          message: 'Chat was successfully renamed',
        })
      );

      onRenameComplete?.();
      onClose();
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message:
            'Something went wrong! We weren\'t able to rename the selected Chat. Please try again later.',
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setRenameValue(conversation.title);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <ModalHeader>Rename Chat</ModalHeader>

      <ModalContent>
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isSubmitting}
          placeholder="Enter chat name"
        />
      </ModalContent>

      <ModalFooter>
        <Button variant="text" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSubmitting || !renameValue.trim()}
          icon={<Save size={16} />}
        >
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { updateConversationTitle } from '@/store/slices/chatSlice';
import { useConversations } from '@/hooks/useConversations';
import { addToast } from '@/store/slices/uiSlice';
import type { Conversation } from '@/types';

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
      dispatch(addToast({
        type: 'error',
        message: 'Chat name cannot be empty',
      }));
      return;
    }

    // If name hasn't changed, just close
    if (trimmedValue === conversation.title) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Update conversation via API
      await updateConversationAsync({ 
        id: conversation.id, 
        updates: { title: trimmedValue } 
      });

      // Update Redux store (already done in mutation onSuccess, but ensure it's updated)
      dispatch(updateConversationTitle({ id: conversation.id, title: trimmedValue }));

      // Show success notification
      dispatch(addToast({
        type: 'success',
        message: 'Chat was successfully renamed',
      }));

      onRenameComplete?.();
      onClose();
    } catch {
      // Show error notification
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to rename the selected Chat. Please try again later.',
      }));
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
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
              Rename Chat
            </h3>

            {/* Input Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                disabled={isSubmitting}
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '16px',
                  fontWeight: 500,
                  lineHeight: '24px',
                  color: '#343A46', // Lynch-900
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid #D5D9E2', // Lynch-200
                  borderRadius: '8px',
                  padding: '10px 14px',
                  boxShadow: '0px 1px 4px 0px #ECEEF2', // Lynch-100
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                placeholder="Enter chat name"
              />
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

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSubmitting || !renameValue.trim()}
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #7122F4', // Electric-Violet-600
                  background: '#7122F4', // Electric-Violet-600
                  boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                  cursor: (isSubmitting || !renameValue.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isSubmitting || !renameValue.trim()) ? 0.5 : 1,
                }}
              >
                <Save size={16} style={{ color: '#F5F2FF' }} />
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
                  Save
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


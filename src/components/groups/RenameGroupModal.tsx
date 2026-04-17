'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { useGroups } from '@/hooks/useGroups';
import { addToast } from '@/store/slices/uiSlice';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
  starred?: boolean;
  archived?: boolean;
}

interface RenameGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  mode?: 'rename' | 'create';
  onRenameComplete?: () => void;
  onCreateComplete?: () => void;
}

export default function RenameGroupModal({
  isOpen,
  onClose,
  group,
  mode = 'rename',
  onRenameComplete,
  onCreateComplete,
}: RenameGroupModalProps) {
  const dispatch = useAppDispatch();
  const { updateGroup, createGroup } = useGroups();
  const [renameValue, setRenameValue] = useState(group?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCreateMode = mode === 'create';

  // Update rename value when group changes (only in rename mode)
  useEffect(() => {
    if (group && !isCreateMode) {
      setRenameValue(group.name);
    } else if (isCreateMode) {
      setRenameValue('');
    }
  }, [group, isCreateMode]);

  // Don't render if modal is closed
  if (!isOpen) return null;
  
  // In rename mode, require a group. In create mode, group can be null
  if (mode === 'rename' && !group) return null;

  const handleSave = async () => {
    const trimmedValue = renameValue.trim();
    
    // Validate input
    if (!trimmedValue) {
      dispatch(addToast({
        type: 'error',
        message: 'Group name cannot be empty',
      }));
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isCreateMode) {
        // Create new group
        await createGroup(trimmedValue);

        // Show success notification
        dispatch(addToast({
          type: 'success',
          message: 'Group was successfully created',
        }));

        onCreateComplete?.();
        onClose();
      } else if (group) {
        // If name hasn't changed, just close
        if (trimmedValue === group.name) {
          onClose();
          setIsSubmitting(false);
          return;
        }

        // Update group via API
        await updateGroup({ 
          groupId: group.id, 
          updates: { name: trimmedValue } 
        });

        // Show success notification
        dispatch(addToast({
          type: 'success',
          message: 'Group was successfully renamed',
        }));

        onRenameComplete?.();
        onClose();
      }
    } catch {
      // Show error notification
      dispatch(addToast({
        type: 'error',
        message: isCreateMode
          ? 'Something went wrong! We weren\'t able to create the group. Please try again later.'
          : 'Something went wrong! We weren\'t able to rename the selected group. Please try again later.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isCreateMode) {
      setRenameValue('');
    } else if (group) {
      setRenameValue(group.name);
    }
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
              {isCreateMode ? 'New Group' : 'Rename Group'}
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
                placeholder="Enter group name"
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


'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Minimize2, Eye } from 'lucide-react';
import MarkdownRenderer from '@/components/ui/markdown-renderer';
import { extractTitleFromContent } from '@/lib/utils/extractTitle';
import { PinnedItemEditPanel } from './PinnedItemEditPanel';
import { PinnedItemNotePanel } from './PinnedItemNotePanel';

interface PinnedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    content: string;
    title?: string;
    note?: string;
    type: 'message' | 'response';
  };
  onEdit?: () => void;
  onAddNote?: () => void;
  isPinMode?: boolean; // New prop to indicate pin mode
  openEditPanel?: boolean; // New prop to open edit panel on mount
  onPin?: (name: string, note: string) => void; // Callback when pinning
  onUpdate?: (id: string, name: string, note: string) => void; // Callback when updating
}

/**
 * Formats content for rendering in the modal.
 * If content is chart JSON, wraps it in the proper batch2-response format.
 */
function formatContentForRendering(content: string): string {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(content);
    
    // Check if it's a chart object
    if (parsed && typeof parsed === 'object' && parsed.type === 'chart') {
      // Wrap in batch2-response format
      const batch2Response = {
        type: 'batch2',
        blocks: [parsed]
      };
      return `<div data-type="batch2-response">${JSON.stringify(batch2Response)}</div>`;
    }
    
    // If it's already in the correct format, return as is
    return content;
  } catch {
    // Not JSON, return as is (regular markdown/text)
    return content;
  }
}

export function PinnedItemModal({
  isOpen,
  onClose,
  item,
  onEdit,
  onAddNote,
  isPinMode = false,
  openEditPanel = false,
  onPin,
  onUpdate,
}: PinnedItemModalProps) {
  const [editPanelOpen, setEditPanelOpen] = useState(isPinMode || openEditPanel); // Open by default in pin mode or if openEditPanel is true
  const [notePanelOpen, setNotePanelOpen] = useState(false); // State for note panel
  const modalRef = useRef<HTMLDivElement>(null);

  // Open edit panel when modal opens in pin mode or when openEditPanel is true
  useEffect(() => {
    if (isOpen && (isPinMode || openEditPanel)) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setEditPanelOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      const timer = setTimeout(() => {
        setEditPanelOpen(false);
        setNotePanelOpen(false); // Close note panel when modal closes
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isPinMode, openEditPanel]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key to close modal or edit panel
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editPanelOpen) {
          setEditPanelOpen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, editPanelOpen]);

  // Close edit panel when modal closes
  useEffect(() => {
    if (!isOpen && editPanelOpen) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setEditPanelOpen(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, editPanelOpen]);

  if (!isOpen) return null;

  const title = isPinMode ? 'Add Pinned Item' : (item.title || extractTitleFromContent(item?.content || ''));
  const formattedContent = formatContentForRendering(item?.content || '');
  
  // Check if content is a table or chart (not plain text)
  const isTableOrChart = (() => {
    if (!item?.content || typeof item.content !== 'string') return false;
    try {
      const parsed = JSON.parse(item.content);
      return parsed && typeof parsed === 'object' && (parsed.type === 'chart' || parsed.type === 'table');
    } catch {
      // Check if content contains table markdown syntax
      return item.content.includes('|') && item.content.includes('---');
    }
  })();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !editPanelOpen) {
      onClose();
    }
  };

  const handleEditClick = () => {
    // Just open the edit panel - don't call onEdit callback
    // onEdit is meant for external triggers, not internal edit button clicks
    setEditPanelOpen(true);
  };

  const handleSaveEdit = (name: string, note: string) => {
    if (isPinMode && onPin) {
      // In pin mode, call onPin callback
      onPin(name, note);
      onClose();
    } else if (onUpdate) {
      // In edit mode, call onUpdate callback
      onUpdate(item.id, name, note);
      // Don't close the panel immediately - let the update complete
      // The panel will close when user clicks close or the modal closes
    } else {
      // Fallback: just close the panel
      console.log('Save edit:', { name, note, itemId: item.id });
      setEditPanelOpen(false);
    }
  };

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
        onClick={handleBackdropClick}
      />

      {/* Modal Dialog Container */}
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
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          style={{
            background: 'var(--Lynch-50, #F6F7F9)',
            border: '1px solid var(--Lynch-100, #ECEEF2)',
            borderRadius: '24px',
            boxShadow: '0px 8px 16px 0px var(--Lynch-100, #ECEEF2)',
            width: '1024px',
            maxHeight: '75vh',
            minHeight: '400px', // Ensure minimum height for edit panel
            height: 'auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              padding: '24px 32px 0 32px',
              flexShrink: 0,
              marginBottom: '10px',
              height: '42px',
              paddingBottom: '10px',
            }}
          >
            {/* Title and Add Note Button */}
            <div
              style={{
                flex: '1 0 0',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <h3
                style={{
                  fontFamily: 'Manrope',
                  fontSize: '20px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '32px',
                  letterSpacing: '-0.12px',
                  color: 'var(--Lynch-900, #343A46)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: '0 1 auto',
                  minWidth: 0,
                }}
              >
                {title || 'Untitled'}
              </h3>
              {!isPinMode && !editPanelOpen && !notePanelOpen && (
                <button
                  onClick={() => {
                    setNotePanelOpen(true);
                    if (onAddNote) {
                      onAddNote();
                    }
                  }}
                  style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 0',
                    borderRadius: '2px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  title="View Note"
                  aria-label="View Note"
                >
                  <Eye size={16} style={{ color: 'var(--Electric-Violet-600, #7122F4)' }} />
                  <span
                    style={{
                      fontFamily: 'Manrope',
                      fontSize: '13px',
                      fontStyle: 'normal',
                      fontWeight: 600,
                      lineHeight: '24px',
                      letterSpacing: '0.09px',
                      color: 'var(--Electric-Violet-600, #7122F4)',
                    }}
                  >
                    View Note
                  </span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {/* Edit Button - Hide in pin mode */}
              {onEdit && !isPinMode && (
                <button
                  onClick={handleEditClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    padding: '4px',
                    borderRadius: '4px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--Lynch-50, #F6F7F9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Edit"
                  aria-label="Edit"
                >
                  <Edit size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                </button>
              )}

              {/* Minimize Button */}
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  padding: '4px',
                  borderRadius: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--Lynch-50, #F6F7F9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Minimize"
                aria-label="Minimize"
              >
                <Minimize2 size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: '1 1 auto',
              overflow: 'auto',
              padding: '0 32px 32px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minHeight: 0,
              alignSelf: 'stretch',
            }}
            className="custom-scrollbar"
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid var(--Lynch-300, #B1BBC8)',
                borderRadius: '12px',
                boxShadow: '0px 1px 4px 0px var(--Lynch-100, #ECEEF2)',
                padding: '1px',
                width: '100%',
              }}
            >
              <div
                style={{
                  background: 'white',
                  borderRadius: '11px',
                  padding: '0',
                  width: '100%',
                  overflow: 'auto',
                  minHeight: '200px',
                }}
                className="custom-scrollbar"
              >
                <div style={{ padding: isTableOrChart ? '0' : '10px' }}>
                  <MarkdownRenderer 
                    content={formattedContent} 
                    isPinnedBoard={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Note Panel - Overlay on Modal */}
          {notePanelOpen && (
            <PinnedItemNotePanel
              isOpen={notePanelOpen}
              onClose={() => {
                setNotePanelOpen(false);
              }}
              note={item.note || ''}
              onEdit={() => {
                // Close note panel and open edit panel
                setNotePanelOpen(false);
                setEditPanelOpen(true);
              }}
            />
          )}

          {/* Edit Panel - Overlay on Modal */}
          {editPanelOpen && (
            <PinnedItemEditPanel
              isOpen={editPanelOpen}
              onClose={() => {
                if (isPinMode) {
                  // In pin mode, closing the panel should close the modal
                  onClose();
                } else {
                  setEditPanelOpen(false);
                }
              }}
              item={item}
              onSave={handleSaveEdit}
              isPinMode={isPinMode}
              key={item.id} // Force re-render when item changes
            />
          )}
        </div>
      </div>
    </>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}


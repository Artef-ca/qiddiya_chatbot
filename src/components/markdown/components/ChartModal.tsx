'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Download, Copy, Pin, PinOff, Minimize2 } from 'lucide-react';
import { ChartModalSidePanel, ExportFormat } from './ChartModalSidePanel';
import { useAppSelector } from '@/store/hooks';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  fullContent?: React.ReactNode; // Full content with wrapper, header, dropdown, etc.
  type?: 'table' | 'chart'; // Type of content to determine header title
  onShare?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  isPinned?: boolean;
  tableChartContent?: { type: 'table' | 'chart'; content: string; title?: string } | null;
  chatId?: string;
}

export function ChartModal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children, 
  fullContent,
  type = 'chart',
  onShare,
  onDownload,
  onCopy,
  onPin,
  onUnpin,
  isPinned = false,
  tableChartContent = null,
  chatId: chatIdProp,
}: ChartModalProps) {
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelType, setSidePanelType] = useState<'Share' | 'Export' | 'Copy'>('Share');
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0, height: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const { activeConversationId } = useAppSelector((state) => state.chat);
  
  // Use provided chatId or fallback to activeConversationId
  const chatId = chatIdProp || activeConversationId || '';

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

  // Close side panel when modal closes
  useEffect(() => {
    if (!isOpen && sidePanelOpen) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setSidePanelOpen(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sidePanelOpen]);

  // Update modal position when it opens or resizes
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const updatePosition = () => {
        const rect = modalRef.current?.getBoundingClientRect();
        if (rect) {
          setModalPosition({
            top: rect.top,
            left: rect.left,
            height: rect.height,
          });
        }
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }
  }, [isOpen, fullContent, children]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !sidePanelOpen) {
      onClose();
    }
  };

  const handleShareClick = () => {
    // For expanded table/chart content, keep Share disabled and open Export directly.
    setSidePanelType(tableChartContent ? 'Export' : 'Share');
    setSidePanelOpen(true);
    // Don't call onShare here - let the side panel handle it
  };

  const handleDownloadClick = () => {
    setSidePanelType('Export');
    setSidePanelOpen(true);
    // Don't call onDownload here - let the side panel handle it
  };

  const handleCopyClick = () => {
    setSidePanelType('Copy');
    setSidePanelOpen(true);
    // Don't call onCopy here - let the side panel handle it
  };

  const handleSidePanelShare = (emails: string, message: string, formats: ExportFormat[]) => {
    // Handle share logic here
    console.log('Share:', { emails, message, formats });
    if (onShare) {
      onShare();
    }
  };

  const handleSidePanelExport = (format: ExportFormat) => {
    // Handle export logic here
    console.log('Export:', format);
    if (onDownload) {
      onDownload();
    }
  };

  const handleSidePanelCopy = () => {
    // Handle copy logic here
    console.log('Copy');
    if (onCopy) {
      onCopy();
    }
  };

  const modalTitle = title || (type === 'table' ? 'Table' : 'Chart');

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
            maxHeight: '520px',
            height: 'auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
            position: 'relative', // Add relative positioning for absolute side panel
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              padding: '24px 32px 0 32px',
              flexShrink: 0,
            }}
          >
            {/* Title */}
            <div
              style={{
                flex: '1 0 0',
                height: '42px',
                paddingBottom: '10px',
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              <h3
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '20px',
                  fontWeight: 600,
                  lineHeight: '32px',
                  letterSpacing: '-0.12px',
                  color: 'var(--Lynch-900, #343A46)',
                  margin: 0,
                }}
              >
                {modalTitle}
              </h3>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '6px 0',
              }}
            >
              {/* Share Button */}
              {onShare && (
                <button
                  onClick={handleShareClick}
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
                  title="Share"
                  aria-label="Share"
                >
                  <Share2 size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                </button>
              )}

              {/* Download Button */}
              {onDownload && (
                <button
                  onClick={handleDownloadClick}
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
                  title="Download"
                  aria-label="Download"
                >
                  <Download size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                </button>
              )}

              {/* Copy Button */}
              {onCopy && (
                <button
                  onClick={handleCopyClick}
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
                  title="Copy"
                  aria-label="Copy"
                >
                  <Copy size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                </button>
              )}

              {/* Pin/Unpin Button */}
              {(onPin || onUnpin) && (
                <button
                  onClick={isPinned ? onUnpin : onPin}
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
                  title={isPinned ? 'Unpin' : 'Pin'}
                  aria-label={isPinned ? 'Unpin' : 'Pin'}
                >
                  {isPinned ? (
                    <PinOff size={16} style={{ color: 'var(--Picton-Blue-700, #0093D4)' }} />
                  ) : (
                    <Pin size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                  )}
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
              overflow: fullContent ? 'auto' : 'hidden',
              padding: fullContent ? '0' : '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minHeight: 0,
              alignSelf: 'stretch',
            }}
          >
            {fullContent || children}
          </div>

          {/* Side Panel - Overlay on Modal */}
          {sidePanelOpen && (
            <>
              <style>{`
                @keyframes slideInFromRight {
                  from {
                    transform: translateX(100%);
                    opacity: 0;
                  }
                  to {
                    transform: translateX(0);
                    opacity: 1;
                  }
                }
              `}</style>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '500px',
                  height: '100%',
                  borderLeft: '1px solid var(--Lynch-200, #D5D9E2)',
                  display: 'flex',
                  flexDirection: 'column',
                  animation: 'slideInFromRight 0.3s ease-in-out',
                  overflow: 'hidden',
                  zIndex: 10,
                  background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)',
                  boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <ChartModalSidePanel
                  isOpen={sidePanelOpen}
                  onClose={() => setSidePanelOpen(false)}
                  type={sidePanelType}
                  modalHeight={modalPosition.height || 518}
                  modalTop={0}
                  modalLeft={0}
                  onShare={handleSidePanelShare}
                  onExport={handleSidePanelExport}
                  onCopy={handleSidePanelCopy}
                  contentTitle={modalTitle}
                  isInsideModal={true}
                  tableChartContent={tableChartContent}
                  chatId={chatId}
                />
              </div>
            </>
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


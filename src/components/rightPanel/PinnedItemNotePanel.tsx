'use client';

import React from 'react';
import { X, Edit } from 'lucide-react';

interface PinnedItemNotePanelProps {
  isOpen: boolean;
  onClose: () => void;
  note: string;
  onEdit: () => void;
}

export function PinnedItemNotePanel({
  isOpen,
  onClose,
  note,
  onEdit,
}: PinnedItemNotePanelProps) {
  if (!isOpen) return null;

  return (
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
        
        .note-panel-enter {
          animation: slideInFromRight 0.3s ease-out;
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
          <div
            style={{
              display: 'flex',
              flex: '1 0 0',
              flexDirection: 'column',
              padding: '24px 32px 32px 32px',
              overflow: 'auto',
              minHeight: 0,
            }}
            className="custom-scrollbar"
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexShrink: 0,
                marginBottom: '4px',
              }}
            >
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                flex: '1 0 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '42px',
                  paddingBottom: '8px',
                }}
              >
                <h4
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '18px',
                    fontStyle: 'normal',
                    fontWeight: 700,
                    lineHeight: '24px',
                    letterSpacing: '-0.0594px',
                    color: 'var(--Lynch-800, #3A4252)',
                    margin: 0,
                  }}
                >
                  Note
                </h4>
              </div>
              <button
                onClick={onEdit}
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1px 0',
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
                title="Edit"
                aria-label="Edit"
              >
                <Edit size={16} style={{ color: 'var(--Electric-Violet-600, #7122F4)' }} />
                <span
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: 'var(--Electric-Violet-600, #7122F4)',
                  }}
                >
                  Edit
                </span>
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              title="Close"
              aria-label="Close"
            >
              <X size={16} style={{ color: 'var(--Lynch-800, #3A4252)' }} />
            </button>
            </div>

            {/* Content */}
            <div
              style={{
                flex: '1 0 0',
                fontFamily: 'Manrope',
                fontSize: '16px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '24px',
                color: 'var(--Lynch-800, #3A4252)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginTop: '16px',
              }}
            >
              {note || 'No note added yet.'}
            </div>

            {/* Action Bar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                marginTop: '32px',
                flexShrink: 0,
              }}
            >
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: 'var(--Lynch-700, #434E61)',
                  }}
                >
                  Close
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


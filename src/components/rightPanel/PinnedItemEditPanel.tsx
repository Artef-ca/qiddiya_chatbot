'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';

interface PinnedItemEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    content: string;
    title?: string;
    type: 'message' | 'response';
    note?: string;
  };
  onSave?: (name: string, note: string) => void;
  isPinMode?: boolean; // New prop to indicate pin mode
}

export function PinnedItemEditPanel({
  isOpen,
  onClose,
  item,
  onSave,
  isPinMode = false,
}: PinnedItemEditPanelProps) {
  const [name, setName] = useState(item.title || '');
  const [note, setNote] = useState(item.note || '');
  const [error, setError] = useState<string | null>(null);

  // Update form when item changes (both when panel is open and closed)
  useEffect(() => {
    const timer = setTimeout(() => {
      setName(item.title || '');
      setNote(item.note || '');
      setError(null); // Clear error when item changes
    }, 0);
    return () => clearTimeout(timer);
  }, [item.title, item.note, item.id]);

  const handleSave = () => {
    // Validate name is required
    if (!name.trim()) {
      setError('This field is required.');
      return;
    }
    
    // Clear error if validation passes
    setError(null);
    
    if (onSave) {
      onSave(name.trim(), note.trim());
    }
    onClose();
  };

  const handleCancel = () => {
    setName(item.title || '');
    setNote(item.note || '');
    onClose();
  };

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
            // gap: '32px',
            padding: '24px 32px 32px 32px',
            overflow: 'auto',
            minHeight: 0,
            maxHeight: '100%', // Ensure it respects parent height
          }}
          className="custom-scrollbar"
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                flex: '1 0 0',
                height: '42px',
                paddingBottom: '8px',
                display: 'flex',
                alignItems: 'flex-start',
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
                {isPinMode ? 'Add Info' : 'Edit Info'}
              </h4>
            </div>
            <button
              onClick={handleCancel}
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

          {/* Form */}
          <div
            style={{
              display: 'flex',
              flex: '1 0 0',
              flexDirection: 'column',
              gap: '16px',
              minHeight: 0,
            }}
          >
            {/* Name Field */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '2px',
                  alignItems: 'center',
                  lineHeight: '24px',
                }}
              >
                <label
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.09px',
                    color: 'var(--Lynch-900, #343A46)',
                  }}
                >
                  Name
                </label>
                <span
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '24px',
                    color: 'var(--Electric-Violet-600, #7122F4)',
                  }}
                >
                  *
                </span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Clear error when user starts typing
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder={isPinMode ? 'Pinned Item name' : 'Enter name'}
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: `1px solid ${error ? 'var(--Red-500, #EF4444)' : 'var(--Lynch-200, #D5D9E2)'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontFamily: 'Manrope',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '24px',
                  color: 'var(--Lynch-900, #343A46)',
                  boxShadow: error ? '0px 1px 4px 0px rgba(239, 68, 68, 0.1)' : '0px 1px 4px 0px var(--Lynch-100, #ECEEF2)',
                  width: '100%',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  if (!error) {
                    e.currentTarget.style.borderColor = 'var(--Electric-Violet-600, #7122F4)';
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.currentTarget.style.borderColor = 'var(--Lynch-200, #D5D9E2)';
                  }
                }}
              />
              {error ? (
                <p
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.09px',
                    color: 'var(--Red-500, #EF4444)',
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              ) : (
                <p
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.09px',
                    color: 'var(--Lynch-500, #64748B)',
                    margin: 0,
                  }}
                >
                  Select a name that allows you to easily identify the item
                </p>
              )}
            </div>

            {/* Note Field */}
            <div
              style={{
                display: 'flex',
                flex: '1 0 0',
                flexDirection: 'column',
                gap: '6px',
                minHeight: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '2px',
                  alignItems: 'center',
                  lineHeight: '24px',
                }}
              >
                <label
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.09px',
                    color: 'var(--Lynch-900, #343A46)',
                  }}
                >
                  Note
                </label>
                <span
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.09px',
                    color: '#7F56D9',
                  }}
                >
                  (optional)
                </span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isPinMode ? 'Write a short note about the item...' : 'Add a note...'}
                style={{
                  flex: '1 0 0',
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid var(--Lynch-200, #D5D9E2)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontFamily: 'Manrope',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '24px',
                  color: 'var(--Lynch-900, #343A46)',
                  boxShadow: '0px 1px 4px 0px var(--Lynch-100, #ECEEF2)',
                  width: '100%',
                  minHeight: '100px',
                  resize: 'vertical',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--Electric-Violet-600, #7122F4)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--Lynch-200, #D5D9E2)';
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: '32px',
              alignItems: 'flex-end',
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
                onClick={handleCancel}
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
                  e.currentTarget.style.backgroundColor = 'var(--Lynch-50, #F6F7F9)';
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
                    letterSpacing: '0.09px',
                    color: 'var(--Lynch-700, #434E61)',
                  }}
                >
                  Cancel
                </span>
              </button>
              <button
                onClick={handleSave}
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: 'var(--Electric-Violet-600, #7122F4)',
                  border: '1px solid var(--Electric-Violet-600, #7122F4)',
                  cursor: 'pointer',
                  boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--Electric-Violet-700, #5A1FD4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--Electric-Violet-600, #7122F4)';
                }}
              >
                {isPinMode ? (
                  <Plus size={16} style={{ color: 'var(--Electric-Violet-50, #F5F2FF)' }} />
                ) : (
                  <Save size={16} style={{ color: 'var(--Electric-Violet-50, #F5F2FF)' }} />
                )}
                <span
                  style={{
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 700,
                    lineHeight: '24px',
                    letterSpacing: '0.09px',
                    color: 'var(--Electric-Violet-50, #F5F2FF)',
                  }}
                >
                  {isPinMode ? 'Pin Item' : 'Save'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


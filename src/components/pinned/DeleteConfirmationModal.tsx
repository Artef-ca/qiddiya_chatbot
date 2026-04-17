'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Trash2 } from 'lucide-react';
import { extractTitleFromContent } from '@/lib/utils/extractTitle';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{ id: string; title?: string; content: string }>;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  items,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const count = items.length;
  const showAllItems = count <= 5;

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="danger" maxWidth="500px">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          width: '100%',
        }}
      >
        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            width: '100%',
          }}
        >
          {/* Title */}
          <div
            style={{
              paddingBottom: '10px',
              paddingTop: 0,
              paddingLeft: 0,
              paddingRight: 0,
            }}
          >
            <p
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: '32px',
                letterSpacing: '-0.12px',
                color: 'var(--Lynch-900, #343A46)',
                margin: 0,
              }}
            >
              Delete Pinned Items
            </p>
          </div>

          {/* Message */}
          <div
            style={{
              paddingBottom: '16px',
              paddingTop: 0,
              paddingLeft: 0,
              paddingRight: 0,
            }}
          >
            <p
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '24px',
                color: 'var(--Lynch-900, #343A46)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              <span>
                Are you sure you want to delete...({count})?
                <br />
                {showAllItems ? (
                  // Show all items if count <= 5
                  items.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {index > 0 && <br />}
                      - <span style={{ fontWeight: 700 }}>{item.title || extractTitleFromContent(item.content)}</span>
                    </React.Fragment>
                  ))
                ) : (
                  // Show first few items and [...] if count > 5
                  <>
                    {items.slice(0, 2).map((item, index) => (
                      <React.Fragment key={item.id}>
                        {index > 0 && <br />}
                        - <span style={{ fontWeight: 700 }}>{item.title || extractTitleFromContent(item.content)}</span>
                      </React.Fragment>
                    ))}
                    <br />
                    - <span style={{ fontWeight: 700 }}>[...]</span>
                  </>
                )}
              </span>
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            width: '100%',
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
              onClick={onClose}
              style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: 'var(--Lynch-700, #434E61)',
                }}
              >
                Cancel
              </span>
            </button>

            {/* Delete Button */}
            <button
              onClick={onConfirm}
              style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--Punch-600, #D64933)',
                background: 'var(--Punch-600, #D64933)',
                cursor: 'pointer',
                boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Trash2 size={16} style={{ color: 'var(--Electric-Violet-50, #F5F2FF)' }} />
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: 'var(--Electric-Violet-50, #F5F2FF)',
                }}
              >
                Delete
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


'use client';

import React from 'react';
import { Expand, Share2, Copy, Pin, PinOff } from 'lucide-react';

interface HoverMenuProps {
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onExpand?: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  isPinned?: boolean;
  expandLabel?: string;
  shareLabel?: string;
  copyLabel?: string;
  pinLabel?: string;
  unpinLabel?: string;
}

export function HoverMenu({
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onExpand,
  onShare,
  onCopy,
  onPin,
  onUnpin,
  isPinned = false,
  expandLabel = 'Expand',
  shareLabel = 'Share',
  copyLabel = 'Copy',
  pinLabel = 'Pin',
  unpinLabel = 'Unpin',
}: HoverMenuProps) {
  if (!isHovered) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: '0px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        background: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0px 4px 8px 0px var(--Lynch-200, #D5D9E2)',
        border: '1px solid var(--Lynch-200, #D5D9E2)',
        padding: '4px',
        zIndex: 10,
        minWidth: '32px',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Expand Option - at the top */}
      {onExpand && (
        <button
          onClick={onExpand}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: '8px',
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
          title={expandLabel}
          aria-label={expandLabel}
        >
          <Expand 
            size={16} 
            style={{ color: 'var(--Lynch-600, #6B7785)' }} 
          />
        </button>
      )}

      {/* Share Option - always visible */}
      <button
        onClick={onShare || (() => {})}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          padding: '8px',
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
        title={shareLabel}
        aria-label={shareLabel}
      >
        <Share2 
          size={16} 
          style={{ color: 'var(--Lynch-600, #6B7785)' }} 
        />
      </button>

      {/* Copy Option */}
      {onCopy && (
        <button
          onClick={onCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: '8px',
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
          title={copyLabel}
          aria-label={copyLabel}
        >
          <Copy 
            size={16} 
            style={{ color: 'var(--Lynch-600, #6B7785)' }} 
          />
        </button>
      )}

      {/* Pin/Unpin Option */}
      {(onPin || onUnpin) && (
        <button
          onClick={isPinned ? onUnpin : onPin}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: '8px',
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
          title={isPinned ? unpinLabel : pinLabel}
          aria-label={isPinned ? unpinLabel : pinLabel}
        >
          {isPinned ? (
            <PinOff 
              size={16} 
              style={{ color: 'var(--color-secondary-600, #0093D4)' }} 
            />
          ) : (
            <Pin 
              size={16} 
              style={{ color: 'var(--Lynch-600, #6B7785)' }} 
            />
          )}
        </button>
      )}
    </div>
  );
}


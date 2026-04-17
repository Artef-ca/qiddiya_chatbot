/**
 * Reusable Context Menu component
 * Standardizes dropdown menu styling and behavior
 */

'use client';

import { ReactNode, useRef, useEffect } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { themeColors, themeRadius, themeSpacing } from '@/lib/utils/theme';
import { cn } from '@/lib/utils';

interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
  minWidth?: string;
}

export function ContextMenu({
  isOpen,
  onClose,
  items,
  position = 'top-right',
  className,
  minWidth = '200px',
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => {
    if (isOpen) {
      onClose();
    }
  });

  if (!isOpen) return null;

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: '28px', right: '0' },
    'top-left': { top: '28px', left: '0' },
    'bottom-right': { bottom: '28px', right: '0' },
    'bottom-left': { bottom: '28px', left: '0' },
  };

  return (
    <div
      ref={menuRef}
      className={cn('absolute z-50', className)}
      style={{
        ...positionStyles[position],
        minWidth,
        background: themeColors.background(),
        borderRadius: themeRadius.md(),
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        padding: `${themeSpacing.xs()} 0`,
        border: `1px solid ${themeColors.border()}`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <div key={index}>
          {index > 0 && (
            <div
              style={{
                height: '1px',
                background: themeColors.border(),
                margin: `${themeSpacing.xs()} 0`,
              }}
            />
          )}
          <button
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '20px',
              color: item.variant === 'danger'
                ? themeColors.error()
                : themeColors.textPrimary(),
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
            }}
          >
            {item.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}


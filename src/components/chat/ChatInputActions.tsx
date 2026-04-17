/**
 * Chat input action buttons component
 * Extracted from ChatInput for better organization
 */

import { AtSign, Paperclip, Plus } from 'lucide-react';
import { useState, useRef, useLayoutEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '@/hooks';
import { useAppSelector } from '@/store/hooks';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import PinnedItemCard from './PinnedItemCard';
import type { PinnedItem } from '@/types';
import { BUTTON_STYLES, COLORS } from '@/lib/styles/commonStyles';

interface ChatInputActionsProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectPinnedItem: (item: PinnedItem) => void;
  selectedPinnedItems: PinnedItem[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onLinkDatasetClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const ACTION_ICON_STYLE: React.CSSProperties = {
  width: '16px',
  height: '16px',
  aspectRatio: '1/1',
  color: COLORS.lynch[700],
};

interface ActionTextButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  active?: boolean;
}

const ActionTextButton = forwardRef<HTMLButtonElement, ActionTextButtonProps>(({
  onClick,
  disabled,
  ariaLabel,
  children,
  active = false,
}, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 rounded ${
        active ? 'bg-gray-100' : ''
      }`}
      style={{
        ...BUTTON_STYLES.textButton,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
});

ActionTextButton.displayName = 'ActionTextButton';

export function ChatInputActions({
  onFileSelect,
  onSelectPinnedItem,
  selectedPinnedItems,
  fileInputRef,
  onLinkDatasetClick,
  isLoading = false,
  disabled = false,
}: ChatInputActionsProps) {
  const [showPinnedSelector, setShowPinnedSelector] = useState(false);
  const pinnedSelectorRef = useRef<HTMLDivElement>(null);
  const addPinnedButtonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const { items: apiItems } = usePinnedItems();
  const reduxItems = useAppSelector((state) => {
    return state.pinned.items.map((item) => ({
      ...item,
      pinnedAt: new Date(item.pinnedAt),
    }));
  });
  // Use API items if available, otherwise fall back to Redux (same as PinBoard)
  const pinnedItems = apiItems.length > 0 ? apiItems : reduxItems;

  useClickOutside([pinnedSelectorRef, popupRef], () => {
    setShowPinnedSelector(false);
  });

  // Update popup position when opened or on scroll/resize (useLayoutEffect to avoid flash)
  useLayoutEffect(() => {
    if (!showPinnedSelector || !addPinnedButtonRef.current) return;

    const updatePosition = () => {
      if (addPinnedButtonRef.current) {
        const rect = addPinnedButtonRef.current.getBoundingClientRect();
        setPopupPosition({
          left: rect.left,
          top: rect.top - 8, // 8px gap above button (mb-2)
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showPinnedSelector]);

  const handleSelectPinnedItem = (item: PinnedItem) => {
    onSelectPinnedItem(item);
    setShowPinnedSelector(false);
  };

  const pinnedSelectorPopup = showPinnedSelector && typeof document !== 'undefined' && (
    <div
      ref={popupRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-64 overflow-y-auto"
      style={{
        minWidth: '250px',
        maxWidth: '400px',
        left: popupPosition.left,
        top: popupPosition.top,
        transform: 'translateY(-100%)',
        zIndex: 9999,
      }}
      role="menu"
      aria-label="Pinned items selector"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setShowPinnedSelector(false);
        }
      }}
    >
      <div className="text-xs font-semibold mb-2 px-2" style={{ color: COLORS.lynch[700] }}>
        Select Pinned Items
      </div>
      {pinnedItems.length > 0 ? (
        <div className="space-y-1">
          {pinnedItems.map((item) => (
            <PinnedItemCard
              key={item.id}
              item={item}
              onSelect={handleSelectPinnedItem}
              showRemove={false}
              isSelected={selectedPinnedItems.some((p) => p.id === item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 py-4 text-center">
          No pinned items available
        </div>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-4">
      <div className="relative" ref={pinnedSelectorRef}>
        <ActionTextButton
          ref={addPinnedButtonRef}
          onClick={() => setShowPinnedSelector(!showPinnedSelector)}
          disabled={isLoading || disabled}
          ariaLabel="Add pinned item"
          active={showPinnedSelector}
        >
          <Plus 
            className="h-4 w-4" 
            style={ACTION_ICON_STYLE}
            aria-hidden="true" 
          />
          <span className="hidden sm:inline">Add Pinned</span>
        </ActionTextButton>
        {typeof document !== 'undefined' && createPortal(pinnedSelectorPopup, document.body)}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFileSelect}
        aria-label="File input"
      />
      <ActionTextButton
        onClick={() => fileInputRef.current?.click()}
        disabled
        ariaLabel="Attach file (disabled)"
      >
        <Paperclip 
          className="h-4 w-4" 
          style={ACTION_ICON_STYLE}
          aria-hidden="true" 
        />
        <span className="hidden sm:inline">Attach File</span>
      </ActionTextButton>
      <ActionTextButton
        onClick={onLinkDatasetClick}
        disabled
        ariaLabel="Link dataset (disabled)"
      >
        <AtSign
          className="h-4 w-4"
          style={ACTION_ICON_STYLE}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">Link Dataset</span>
      </ActionTextButton>
    </div>
  );
}


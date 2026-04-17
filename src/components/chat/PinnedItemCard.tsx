'use client';

import { Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PinnedItem } from '@/types';

interface PinnedItemCardProps {
  item: PinnedItem;
  onRemove?: (id: string) => void;
  onSelect?: (item: PinnedItem) => void;
  showRemove?: boolean;
  isSelected?: boolean;
}

export default function PinnedItemCard({ 
  item, 
  onRemove, 
  onSelect,
  showRemove = true,
  isSelected = false
}: PinnedItemCardProps) {
  // Get display text - use title or full content (truncation handled by CSS)
  const displayText = item.title || item.content;
  
  // Suppress unused variable warning - isSelected may be used for styling in future
  void isSelected;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded border transition-colors',
        showRemove && onRemove ? '' : 'cursor-pointer'
      )}
      style={{
        display: 'flex',
        padding: '4px 4px 4px 8px',
        alignItems: 'center',
        height: '32px',
        maxWidth: '162px',
        borderRadius: '4px',
        border: '1px solid var(--Lynch-200, #D5D9E2)',
        background: 'var(--Lynch-100, #ECEEF2)',
      }}
      onClick={showRemove && onRemove ? undefined : () => onSelect?.(item)}
    >
      <div className="shrink-0">
        <Pin 
          style={{ 
            width: '16px',
            height: '16px',
            aspectRatio: '1/1',
            color: 'var(--Lynch-500, #64748B)'
          }}
        />
      </div>
      <div 
        className="min-w-0"
        style={{
          flex: '1 1 0',
          minWidth: 0,
          overflow: 'hidden',
          color: 'var(--Lynch-600, #526077)',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'Manrope',
          fontSize: '13px',
          fontStyle: 'normal',
          fontWeight: 600,
          lineHeight: '24px',
          letterSpacing: '0.09px',
        }}
        title={displayText}
      >
        {displayText}
      </div>
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="shrink-0 p-0.5 hover:bg-gray-100 rounded transition-colors"
          aria-label={`Remove pinned item`}
          title="Remove"
        >
          <X 
            className="h-3 w-3" 
            style={{ color: 'var(--Lynch-600, #526077)' }}
          />
        </button>
      )}
    </div>
  );
}


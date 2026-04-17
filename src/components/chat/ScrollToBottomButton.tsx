/**
 * Scroll to bottom button component
 * Extracted from ChatContainer for better organization
 */

import { ChevronsDown } from 'lucide-react';
import { SHADOW_STYLES, COLORS, TEXT_STYLES, BORDER_RADIUS } from '@/lib/styles/commonStyles';

interface ScrollToBottomButtonProps {
  onClick: () => void;
}

export function ScrollToBottomButton({ onClick }: ScrollToBottomButtonProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: '100%',
        marginBottom: '12px',
        // Below RightPanel (z-50) and tablet overlay scrim (z-40); above chat content (z-10)
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <button
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        style={{
          display: 'flex',
          padding: '6px var(--spacing-lg, 12px)',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'var(--spacing-xs, 4px)',
          borderRadius: BORDER_RADIUS.md,
          border: `1px solid ${COLORS.lynch[300]}`,
          background: COLORS.lynch[50],
          boxShadow: SHADOW_STYLES.scrollButton,
          cursor: 'pointer',
          transition: 'opacity 0.2s ease-in-out',
          pointerEvents: 'auto',
        }}
        aria-label="Scroll to bottom"
      >
        <ChevronsDown 
          style={{
            width: '16px',
            height: '16px',
            color: COLORS.lynch[700],
          }}
        />
        <span style={TEXT_STYLES.label}>
          Scroll to Bottom
        </span>
      </button>
    </div>
  );
}


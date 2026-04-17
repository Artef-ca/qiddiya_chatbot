/**
 * Common style objects and utilities for reuse across components
 * Reduces code duplication and ensures consistency
 */

import { COLORS, SPACING, BORDER_RADIUS, FONT_FAMILY, TYPOGRAPHY } from './constants';

// Re-export constants for convenience
export { COLORS, SPACING, BORDER_RADIUS, FONT_FAMILY, TYPOGRAPHY };

/**
 * Common container styles
 */
export const CONTAINER_STYLES = {
  chatContainer: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: SPACING.md,
  },
  /** Use true only when the right panel is open *and* layout reserves space beside it (xl+); tablet uses overlay, so false there. */
  chatContainerWithPadding: (reserveSpaceForRightPanel: boolean) => ({
    padding: reserveSpaceForRightPanel ? '24px 40px 10px 132px' : '24px 132px 10px 132px',
  }),
  chatInputContainer: (reserveSpaceForRightPanel: boolean) => ({
    padding: reserveSpaceForRightPanel ? '0 40px 32px 132px' : '0 132px 23px 132px',
  }),
  scrollContainer: (reserveSpaceForRightPanel: boolean) => ({
    padding: reserveSpaceForRightPanel ? '0 40px 0 132px' : '0 132px 0 132px',
  }),
  contentWidth: {
    // Responsive chat column:
    // - On laptop/desktop: caps at 800px (keeps current design)
    // - On tablet: shrinks to fit available space to avoid horizontal shifting
    width: '100%',
    maxWidth: '800px',
  },
} as const;

/**
 * Common gradient styles
 */
export const GRADIENT_STYLES = {
  topGradient: {
    background: 'linear-gradient(180deg, var(--color-gray-50, #F6F7F9) 16.66%, rgba(246, 247, 249, 0.90) 44.18%, rgba(246, 247, 249, 0.00) 99.65%)',
  },
  bottomGradient: {
    background: 'linear-gradient(0deg, var(--color-gray-50, #F6F7F9) 16.66%, rgba(246, 247, 249, 0.90) 44.18%, rgba(246, 247, 249, 0.00) 99.65%)',
  },
  topGradientLynch100: {
    background: 'linear-gradient(180deg, var(--Lynch-100, #ECEEF2) 16.66%, rgba(236, 238, 242, 0.90) 44.18%, rgba(236, 238, 242, 0.00) 99.65%)',
  },
  bottomGradientLynch100: {
    background: 'linear-gradient(0deg, var(--Lynch-100, #ECEEF2) 16.66%, rgba(236, 238, 242, 0.90) 44.18%, rgba(236, 238, 242, 0.00) 99.65%)',
  },
  sidebarHeaderGradient: {
    background: 'linear-gradient(0deg, rgba(236, 238, 242, 0.10) 0%, var(--Lynch-100, #ECEEF2) 22.16%)',
  },
} as const;

/**
 * Common button styles
 */
export const BUTTON_STYLES = {
  iconButton: {
    display: 'flex',
    padding: '4px',
    borderRadius: BORDER_RADIUS.base,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
  },
  iconButtonHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionButton: {
    display: 'flex',
    padding: '10px',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  },
  textButton: {
    fontFamily: FONT_FAMILY.manrope,
    fontSize: TYPOGRAPHY.text.small.fontSize,
    fontWeight: TYPOGRAPHY.text.small.fontWeight,
    lineHeight: TYPOGRAPHY.text.small.lineHeight,
    letterSpacing: TYPOGRAPHY.text.small.letterSpacing,
    color: COLORS.lynch[700],
    padding: '4px 8px',
    borderRadius: BORDER_RADIUS.base,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  },
} as const;

/**
 * Common card styles
 */
export const CARD_STYLES = {
  userMessageCard: {
    display: 'flex',
    padding: '12px',
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    alignItems: 'flex-start' as const,
    gap: SPACING.sm,
    alignSelf: 'stretch' as const,
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.lynch[200]}`,
    background: COLORS.lynch[100],
  },
  pinnedItemCard: {
    display: 'flex',
    padding: '8px 24px 12px 2px',
    alignItems: 'flex-start' as const,
    alignSelf: 'stretch' as const,
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.lynch[200]}`,
    background: COLORS.lynch[50],
  },
  pinnedItemContent: {
    display: 'flex',
    minHeight: '120px',
    maxHeight: '255px',
    padding: SPACING.sm,
    flexDirection: 'column' as const,
    alignItems: 'flex-start' as const,
    gap: '10px',
    alignSelf: 'stretch' as const,
    borderRadius: BORDER_RADIUS.md,
    border: `1px solid ${COLORS.lynch[50]}`,
    background: 'rgba(255, 255, 255, 0.60)',
    boxShadow: `0 1px 4px 0 ${COLORS.lynch[200]} inset`,
    overflow: 'hidden' as const,
  },
} as const;

/**
 * Common avatar styles
 */
export const AVATAR_STYLES = {
  userAvatar: {
    height: '32px',
    width: '32px',
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    borderRadius: '999px',
    border: '0.5px solid rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
} as const;

/**
 * Common typography styles
 */
export const TEXT_STYLES = {
  label: {
    fontFamily: FONT_FAMILY.manrope,
    fontSize: TYPOGRAPHY.text.small.fontSize,
    fontWeight: TYPOGRAPHY.text.small.fontWeight,
    lineHeight: TYPOGRAPHY.text.small.lineHeight,
    letterSpacing: TYPOGRAPHY.text.small.letterSpacing,
    color: COLORS.lynch[600],
  },
  title: {
    fontFamily: FONT_FAMILY.manrope,
    fontSize: TYPOGRAPHY.text.small.fontSize,
    fontWeight: 700,
    lineHeight: TYPOGRAPHY.text.small.lineHeight,
    letterSpacing: TYPOGRAPHY.text.small.letterSpacing,
    color: COLORS.lynch[600],
  },
  userMessage: {
    fontFamily: FONT_FAMILY.manrope,
    fontSize: TYPOGRAPHY.text.base.fontSize,
    fontWeight: 600,
    lineHeight: TYPOGRAPHY.text.base.lineHeight,
    color: COLORS.lynch[800],
  },
} as const;

/**
 * Common shadow styles
 */
export const SHADOW_STYLES = {
  chatInput: '0 284px 80px 0 rgba(35, 39, 46, 0.00), 0 182px 73px 0 rgba(35, 39, 46, 0.01), 0 102px 61px 0 rgba(35, 39, 46, 0.02), 0 45px 45px 0 rgba(35, 39, 46, 0.03), 0 11px 25px 0 rgba(35, 39, 46, 0.04)',
  panel: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  scrollButton: '0 4px 8px 0 var(--Lynch-200, #D5D9E2)',
} as const;

/**
 * Helper function to merge styles
 */
export function mergeStyles(...styles: Array<React.CSSProperties | undefined>): React.CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}


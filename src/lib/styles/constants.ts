/**
 * Shared style constants and utilities
 * Centralized location for common styles used across the application
 */

export const FONT_FAMILY = {
  manrope: 'Manrope',
} as const;

export const COLORS = {
  lynch: {
    50: 'var(--Lynch-50, #F6F7F9)',
    100: 'var(--Lynch-100, #ECEEF2)',
    200: 'var(--Lynch-200, #D5D9E2)',
    300: 'var(--Lynch-300, #B1BBC8)',
    400: 'var(--Lynch-400, #8695AA)',
    500: 'var(--Lynch-500, #64748B)',
    600: 'var(--Lynch-600, #526077)',
    700: 'var(--Lynch-700, #434E61)',
    800: 'var(--Lynch-800, #3A4252)',
    900: 'var(--Lynch-900, #343A46)',
  },
  pictonBlue: {
    50: 'var(--Picton-Blue-50, #EFFAFF)',
    100: 'var(--Picton-Blue-100, #DEF4FF)',
    200: 'var(--Picton-Blue-200, #B6EBFF)',
    500: 'var(--Picton-Blue-500, #0BC0FF)',
    800: 'var(--Picton-Blue-800, #00628D)',
  },
  electricViolet: {
    50: 'var(--Electric-Violet-50, #F5F2FF)',
    100: 'var(--Electric-Violet-100, #ECE8FF)',
    300: 'var(--Electric-Violet-300, #C3B2FF)',
    600: 'var(--Electric-Violet-600, #7122F4)',
    700: 'var(--Electric-Violet-700, #6C20E1)',
  },
  jumbo: {
    100: 'var(--Jumbo-100, #E6E6E7)',
    200: 'var(--Jumbo-200, #CFCFD2)',
    400: 'var(--Jumbo-400, #84848C)',
  },
} as const;

export const TYPOGRAPHY = {
  headline: {
    small: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: '32px',
      letterSpacing: '-0.12px',
    },
    medium: {
      fontSize: '25px',
      fontWeight: 600,
      lineHeight: '1.3',
    },
    large: {
      fontSize: '32px',
      fontWeight: 600,
      lineHeight: '40px',
      letterSpacing: '-0.48px',
    },
  },
  text: {
    base: {
      fontSize: '16px',
      fontWeight: 500,
      lineHeight: '24px',
    },
    small: {
      fontSize: '13px',
      fontWeight: 600,
      lineHeight: '24px',
      letterSpacing: '0.09px',
    },
    tiny: {
      fontSize: '13px',
      fontWeight: 500,
      lineHeight: '24px',
    },
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: '24px',
  },
} as const;

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
} as const;

export const BORDER_RADIUS = {
  sm: '2px',
  base: '4px',
  md: '8px',
} as const;

/**
 * Common style objects for reuse
 */
export const COMMON_STYLES = {
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  flexRow: {
    display: 'flex',
    flexDirection: 'row',
  },
} as const;

/**
 * Typography style helpers
 */
export const getTypographyStyle = (
  variant: keyof typeof TYPOGRAPHY.headline | keyof typeof TYPOGRAPHY.text,
  type: 'headline' | 'text' = 'text'
) => {
  const typography = type === 'headline' ? TYPOGRAPHY.headline : TYPOGRAPHY.text;
  const style = typography[variant as keyof typeof typography];

  return {
    fontFamily: FONT_FAMILY.manrope,
    fontStyle: 'normal' as const,
    ...style,
  };
};

/**
 * Get color by name
 */
export const getColor = (colorPath: string): string => {
  const parts = colorPath.split('.');
  let value: any = COLORS;

  for (const part of parts) {
    value = value[part];
    if (!value) return colorPath; // Return original if not found
  }

  return value;
};


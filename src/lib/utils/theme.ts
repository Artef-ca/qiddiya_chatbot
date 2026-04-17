/**
 * Theme utility functions
 * Provides easy access to theme values for colors, spacing, typography, etc.
 */

import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from './css';

/**
 * Get theme color value
 */
export function getThemeColor(path: string): string {
  const parts = path.split('.');
  let value: any = theme.colors;
  
  for (const part of parts) {
    value = value[part];
    if (!value) {
      console.warn(`Theme color not found: ${path}`);
      return path; // Return original if not found
    }
  }
  
  return value;
}

/**
 * Get theme spacing value
 */
export function getThemeSpacing(size: keyof typeof theme.spacing): string {
  return theme.spacing[size];
}

/**
 * Get theme border radius value
 */
export function getThemeBorderRadius(size: keyof typeof theme.borderRadius): string {
  return theme.borderRadius[size];
}

/**
 * Get theme typography style
 */
export function getThemeTypography(
  type: 'display' | 'headline' | 'text',
  size: 'large' | 'medium' | 'small' | 'base' | 'tiny'
) {
  if (type === 'display') {
    return theme.typography.display[size as 'large' | 'medium' | 'small'];
  } else if (type === 'headline') {
    return theme.typography.headline[size as 'large' | 'medium' | 'small'];
  } else {
    return theme.typography.text[size as 'large' | 'base' | 'small' | 'tiny'];
  }
}

/**
 * Common color shortcuts using CSS variables
 */
export const themeColors = {
  // Primary
  primary: () => cssVar(CSS_VARS.primary600),
  primaryLight: () => cssVar(CSS_VARS.primary500),
  primaryDark: () => cssVar(CSS_VARS.primary700),
  primary50: () => cssVar(CSS_VARS.primary50),
  primary100: () => cssVar(CSS_VARS.primary100),
  primary200: () => cssVar(CSS_VARS.primary200),
  primary300: () => cssVar(CSS_VARS.primary300),
  primary500: () => cssVar(CSS_VARS.primary500),
  primary600: () => cssVar(CSS_VARS.primary600),
  primary700: () => cssVar(CSS_VARS.primary700),
  
  // Secondary
  secondary: () => cssVar(CSS_VARS.secondary600),
  secondary500: () => cssVar(CSS_VARS.secondary500),
  secondary600: () => cssVar(CSS_VARS.secondary600),
  secondary800: () => cssVar(CSS_VARS.secondary800),
  
  // Gray
  gray50: () => cssVar(CSS_VARS.gray50),
  gray100: () => cssVar(CSS_VARS.gray100),
  gray200: () => cssVar(CSS_VARS.gray200),
  gray300: () => cssVar(CSS_VARS.gray300),
  gray400: () => cssVar(CSS_VARS.gray400),
  gray500: () => cssVar(CSS_VARS.gray500),
  gray600: () => cssVar(CSS_VARS.gray600),
  gray700: () => cssVar(CSS_VARS.gray700),
  gray800: () => cssVar(CSS_VARS.gray800),
  gray900: () => cssVar(CSS_VARS.gray900),
  
  // Neutral
  neutral50: () => cssVar(CSS_VARS.neutral50),
  neutral100: () => cssVar(CSS_VARS.neutral100),
  neutral200: () => cssVar(CSS_VARS.neutral200),
  neutral300: () => cssVar(CSS_VARS.neutral300),
  neutral400: () => cssVar(CSS_VARS.neutral400),
  neutral500: () => cssVar(CSS_VARS.neutral500),
  neutral950: () => cssVar(CSS_VARS.neutral950),
  
  // Text
  textPrimary: () => cssVar(CSS_VARS.textPrimary),
  textSecondary: () => cssVar(CSS_VARS.textSecondary),
  textMuted: () => cssVar(CSS_VARS.textMuted),
  textInverse: () => cssVar(CSS_VARS.textInverse),
  
  // Background
  background: () => cssVar(CSS_VARS.background),
  backgroundSecondary: () => cssVar(CSS_VARS.backgroundSecondary),
  backgroundTertiary: () => cssVar(CSS_VARS.backgroundTertiary),
  
  // Border
  border: () => cssVar(CSS_VARS.border),
  borderLight: () => cssVar(CSS_VARS.borderLight),
  borderMedium: () => cssVar(CSS_VARS.borderMedium),
  borderFocus: () => cssVar(CSS_VARS.borderFocus),
  
  // Status
  success: () => cssVar(CSS_VARS.success),
  error: () => cssVar(CSS_VARS.error),
  warning: () => cssVar(CSS_VARS.warning),
  info: () => cssVar(CSS_VARS.info),
  
  // Accent
  accentBlue600: () => cssVar(CSS_VARS.accentBlue600),
  accentYellow500: () => cssVar(CSS_VARS.accentYellow500),
  accentOrange500: () => cssVar(CSS_VARS.accentOrange500),
} as const;

/**
 * Common spacing shortcuts
 */
export const themeSpacing = {
  xs: () => theme.spacing.xs,
  sm: () => theme.spacing.sm,
  sm2: () => theme.spacing.sm2,
  md: () => theme.spacing.md,
  lg: () => theme.spacing.lg,
  xl: () => theme.spacing.xl,
  '2xl': () => theme.spacing['2xl'],
} as const;

/**
 * Common border radius shortcuts
 */
export const themeRadius = {
  sm: () => theme.borderRadius.sm,
  base: () => theme.borderRadius.base,
  md: () => theme.borderRadius.md,
  lg: () => theme.borderRadius.lg,
  xl: () => theme.borderRadius.xl,
} as const;


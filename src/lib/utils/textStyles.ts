/**
 * Text style utilities
 * Provides consistent text styling across the application
 */

import { theme } from '@/lib/theme';
import { themeColors } from './theme';

/**
 * Get standard text style
 */
export function getTextStyle(
  size: 'tiny' | 'small' | 'base' | 'large' = 'base',
  weight: 400 | 500 | 600 | 700 = 500,
  color?: string
): React.CSSProperties {
  const typography = theme.typography.text[size];
  
  return {
    fontFamily: 'Manrope, var(--font-manrope)',
    fontSize: typography.size,
    fontWeight: weight,
    lineHeight: typography.lineHeight,
    letterSpacing: size === 'small' ? '0.09px' : size === 'tiny' ? '0.18px' : undefined,
    color: color || themeColors.textPrimary(),
  };
}

/**
 * Get headline style
 */
export function getHeadlineStyle(
  size: 'small' | 'medium' | 'large' = 'medium',
  weight: 400 | 500 | 600 | 700 = 500,
  color?: string
): React.CSSProperties {
  const typography = theme.typography.headline[size];
  
  return {
    fontFamily: 'Manrope, var(--font-manrope)',
    fontSize: typography.size,
    fontWeight: weight,
    lineHeight: typography.lineHeight,
    letterSpacing: size === 'large' ? '-0.48px' : size === 'medium' ? '-0.27px' : '-0.12px',
    color: color || themeColors.textPrimary(),
  };
}

/**
 * Get label style
 */
export function getLabelStyle(color?: string): React.CSSProperties {
  return {
    fontFamily: 'Manrope, var(--font-manrope)',
    fontSize: theme.typography.text.small.size,
    fontWeight: 600,
    lineHeight: '24px',
    letterSpacing: '0.09px',
    color: color || themeColors.gray600(),
  };
}


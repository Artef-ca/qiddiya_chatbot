/**
 * CSS variable utility functions
 */

/**
 * Gets a CSS variable value
 */
export function getCSSVariable(variable: string): string {
  return `var(${variable})`;
}

/**
 * Creates a style object with CSS variable
 */
export function cssVar(variable: string): string {
  return getCSSVariable(variable);
}

/**
 * Creates a style object with multiple CSS variables
 */
export function cssVars(variables: Record<string, string>): React.CSSProperties {
  const styles: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    styles[key] = cssVar(value);
  }
  return styles as React.CSSProperties;
}

/**
 * Common CSS variable names
 */
export const CSS_VARS = {
  // Primary colors
  primary: '--color-primary',
  primary50: '--color-primary-50',
  primary100: '--color-primary-100',
  primary200: '--color-primary-200',
  primary300: '--color-primary-300',
  primary400: '--color-primary-400',
  primary500: '--color-primary-500',
  primary600: '--color-primary-600',
  primary700: '--color-primary-700',
  primary800: '--color-primary-800',
  primary900: '--color-primary-900',
  primary950: '--color-primary-950',

  // Secondary colors
  secondary: '--color-secondary',
  secondary50: '--color-secondary-50',
  secondary100: '--color-secondary-100',
  secondary200: '--color-secondary-200',
  secondary300: '--color-secondary-300',
  secondary400: '--color-secondary-400',
  secondary500: '--color-secondary-500',
  secondary600: '--color-secondary-600',
  secondary700: '--color-secondary-700',
  secondary800: '--color-secondary-800',
  secondary900: '--color-secondary-900',
  secondary950: '--color-secondary-950',

  // Accent colors - Blue
  accentBlue: '--color-accent-blue',
  accentBlue50: '--color-accent-blue-50',
  accentBlue100: '--color-accent-blue-100',
  accentBlue200: '--color-accent-blue-200',
  accentBlue300: '--color-accent-blue-300',
  accentBlue400: '--color-accent-blue-400',
  accentBlue500: '--color-accent-blue-500',
  accentBlue600: '--color-accent-blue-600',
  accentBlue700: '--color-accent-blue-700',
  accentBlue800: '--color-accent-blue-800',
  accentBlue900: '--color-accent-blue-900',
  accentBlue950: '--color-accent-blue-950',

  // Accent colors - Yellow
  accentYellow: '--color-accent-yellow',
  accentYellow50: '--color-accent-yellow-50',
  accentYellow100: '--color-accent-yellow-100',
  accentYellow200: '--color-accent-yellow-200',
  accentYellow300: '--color-accent-yellow-300',
  accentYellow400: '--color-accent-yellow-400',
  accentYellow500: '--color-accent-yellow-500',
  accentYellow600: '--color-accent-yellow-600',
  accentYellow700: '--color-accent-yellow-700',
  accentYellow800: '--color-accent-yellow-800',
  accentYellow900: '--color-accent-yellow-900',
  accentYellow950: '--color-accent-yellow-950',

  // Accent colors - Orange
  accentOrange: '--color-accent-orange',
  accentOrange50: '--color-accent-orange-50',
  accentOrange100: '--color-accent-orange-100',
  accentOrange200: '--color-accent-orange-200',
  accentOrange300: '--color-accent-orange-300',
  accentOrange400: '--color-accent-orange-400',
  accentOrange500: '--color-accent-orange-500',
  accentOrange600: '--color-accent-orange-600',
  accentOrange700: '--color-accent-orange-700',
  accentOrange800: '--color-accent-orange-800',
  accentOrange900: '--color-accent-orange-900',
  accentOrange950: '--color-accent-orange-950',

  // Gray colors
  gray50: '--color-gray-50',
  gray100: '--color-gray-100',
  gray200: '--color-gray-200',
  gray300: '--color-gray-300',
  gray400: '--color-gray-400',
  gray500: '--color-gray-500',
  gray600: '--color-gray-600',
  gray700: '--color-gray-700',
  gray800: '--color-gray-800',
  gray900: '--color-gray-900',
  gray950: '--color-gray-950',

  // Neutral colors
  neutral50: '--color-neutral-50',
  neutral100: '--color-neutral-100',
  neutral200: '--color-neutral-200',
  neutral300: '--color-neutral-300',
  neutral400: '--color-neutral-400',
  neutral500: '--color-neutral-500',
  neutral600: '--color-neutral-600',
  neutral700: '--color-neutral-700',
  neutral800: '--color-neutral-800',
  neutral900: '--color-neutral-900',
  neutral950: '--color-neutral-950',

  // Text colors
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  textMuted: '--color-text-muted',
  textInverse: '--color-text-inverse',

  // Border
  border: '--color-border',
  borderLight: '--color-border-light',
  borderMedium: '--color-border-medium',
  borderFocus: '--color-border-focus',

  // Background
  background: '--color-background',
  backgroundSecondary: '--color-background-secondary',
  backgroundTertiary: '--color-background-tertiary',

  // Code colors
  codeBackground: '--color-code-background',
  codeText: '--color-code-text',
  codeInlineBackground: '--color-code-inline-background',
  codeInlineText: '--color-code-inline-text',

  // Semantic colors
  success: '--color-success',
  error: '--color-error',
  warning: '--color-warning',
  info: '--color-info',
} as const;


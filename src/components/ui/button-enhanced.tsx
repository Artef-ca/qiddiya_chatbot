'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'text';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      fullWidth,
      disabled,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            background: disabled
              ? cssVar(CSS_VARS.neutral100)
              : theme.colors.primary.DEFAULT,
            border: `1px solid ${
              disabled ? cssVar(CSS_VARS.neutral200) : theme.colors.primary.DEFAULT
            }`,
            color: disabled
              ? cssVar(CSS_VARS.neutral400)
              : theme.colors.primary[50],
          };
        case 'secondary':
          return {
            background: disabled
              ? cssVar(CSS_VARS.neutral100)
              : theme.colors.secondary.DEFAULT,
            border: `1px solid ${
              disabled ? cssVar(CSS_VARS.neutral200) : theme.colors.secondary.DEFAULT
            }`,
            color: disabled
              ? cssVar(CSS_VARS.neutral400)
              : cssVar(CSS_VARS.textInverse),
          };
        case 'danger':
          return {
            background: disabled
              ? cssVar(CSS_VARS.neutral100)
              : '#D64933', // Punch-600
            border: `1px solid ${disabled ? cssVar(CSS_VARS.neutral200) : '#D64933'}`,
            color: disabled
              ? cssVar(CSS_VARS.neutral400)
              : theme.colors.primary[50],
          };
        case 'ghost':
          return {
            background: 'transparent',
            border: 'none',
            color: disabled
              ? cssVar(CSS_VARS.neutral400)
              : cssVar(CSS_VARS.textSecondary),
          };
        case 'text':
          return {
            background: 'transparent',
            border: 'none',
            color: disabled
              ? cssVar(CSS_VARS.neutral400)
              : cssVar(CSS_VARS.textSecondary),
          };
        default:
          return {
            background: theme.colors.primary.DEFAULT,
            border: `1px solid ${theme.colors.primary.DEFAULT}`,
            color: theme.colors.primary[50],
          };
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return {
            padding: '4px 8px',
            fontSize: theme.typography.text.tiny.size,
            gap: theme.spacing.xs,
          };
        case 'md':
          return {
            padding: '6px 14px',
            fontSize: theme.typography.text.small.size,
            gap: theme.spacing.xs,
          };
        case 'lg':
          return {
            padding: '10px 20px',
            fontSize: theme.typography.text.base.size,
            gap: theme.spacing.sm,
          };
        default:
          return {
            padding: '6px 14px',
            fontSize: theme.typography.text.small.size,
            gap: theme.spacing.xs,
          };
      }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={className}
        style={{
          display: 'flex',
          gap: sizeStyles.gap,
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Manrope, var(--font-manrope)',
          fontSize: sizeStyles.fontSize,
          fontWeight: variant === 'text' || variant === 'ghost'
            ? theme.typography.weights.semibold.value
            : theme.typography.weights.bold.value,
          lineHeight: '24px',
          letterSpacing: '0.0897px',
          padding: sizeStyles.padding,
          borderRadius: variant === 'primary' || variant === 'secondary' || variant === 'danger'
            ? theme.borderRadius.md
            : theme.borderRadius.lg,
          border: variantStyles.border,
          background: variantStyles.background,
          color: variantStyles.color,
          boxShadow:
            variant === 'primary' || variant === 'secondary' || variant === 'danger'
              ? '0px 1px 2px 0px rgba(16, 24, 40, 0.05)'
              : 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          width: fullWidth ? '100%' : 'auto',
          ...style,
        }}
        {...props}
      >
        {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';


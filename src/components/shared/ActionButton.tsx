/**
 * Reusable Action Button component
 * Standardizes action button styling (Archive, Delete, etc.)
 */

'use client';

import { LucideIcon } from 'lucide-react';
import { themeColors, themeRadius, themeSpacing } from '@/lib/utils/theme';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  title?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function ActionButton({
  icon: Icon,
  onClick,
  title,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  className,
}: ActionButtonProps) {
  const sizeStyles = {
    sm: { width: '32px', height: '32px', padding: '8px' },
    md: { width: '36px', height: '36px', padding: '10px' },
    lg: { width: '40px', height: '40px', padding: '12px' },
  };

  const variantStyles = {
    primary: {
      border: `1px solid ${themeColors.primary300()}`,
      background: themeColors.primary50(),
      boxShadow: `0px 1px 2px 0px ${themeColors.primary100()}`,
      iconColor: themeColors.primary700(),
    },
    secondary: {
      border: `1px solid ${themeColors.gray300()}`,
      background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)',
      boxShadow: `0px 1px 4px 0px ${themeColors.gray100()}`,
      iconColor: themeColors.gray700(),
    },
    danger: {
      border: `1px solid ${themeColors.error()}`,
      background: themeColors.error(),
      boxShadow: `0px 1px 4px 0px ${themeColors.gray100()}`,
      iconColor: themeColors.textInverse(),
    },
  };

  const style = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center rounded-lg transition-colors hover:opacity-90 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        ...sizeStyles[size],
        ...style,
        borderRadius: themeRadius.md(),
      }}
      title={title}
    >
      <Icon
        size={16}
        style={{ color: style.iconColor }}
      />
    </button>
  );
}


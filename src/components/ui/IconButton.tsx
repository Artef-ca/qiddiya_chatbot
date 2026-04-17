/**
 * Reusable icon button component
 * Standardizes button styling across the application
 */

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUTTON_STYLES } from '@/lib/styles/commonStyles';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  ariaLabel?: string;
  title?: string;
  className?: string;
  iconClassName?: string;
  iconSize?: number;
  iconColor?: string;
  disabled?: boolean;
  variant?: 'default' | 'hover';
}

export function IconButton({
  icon: Icon,
  onClick,
  ariaLabel,
  title,
  className,
  iconClassName,
  iconSize = 16,
  iconColor,
  disabled = false,
  variant = 'default',
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 focus-visible:rounded',
        variant === 'hover' && 'hover:bg-gray-100',
        className
      )}
      style={{
        ...BUTTON_STYLES.iconButton,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      aria-label={ariaLabel}
      title={title}
    >
      <Icon
        className={iconClassName}
        size={iconSize}
        style={{ color: iconColor }}
        aria-hidden="true"
      />
    </button>
  );
}

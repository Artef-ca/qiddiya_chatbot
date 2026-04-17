/**
 * Reusable secondary/outline button with icon + label (e.g. New Chat, New Group)
 */

'use client';

import { LucideIcon } from 'lucide-react';
import { themeColors, themeSpacing } from '@/lib/utils/theme';
import { cn } from '@/lib/utils';

interface SecondaryButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
  'aria-label'?: string;
}

export function SecondaryButton({
  icon: Icon,
  label,
  onClick,
  className,
  'aria-label': ariaLabel,
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:opacity-90',
        className
      )}
      style={{
        padding: `${themeSpacing.sm()} ${themeSpacing.sm2()}`,
        gap: themeSpacing.xs(),
        border: `1px solid ${themeColors.gray300()}`,
        background:
          'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)',
        boxShadow: `0px 1px 4px 0px ${themeColors.gray100()}`,
      }}
      aria-label={ariaLabel ?? label}
    >
      <Icon size={16} style={{ color: themeColors.gray700() }} aria-hidden />
      <span
        style={{
          fontFamily: 'Manrope, var(--font-manrope)',
          fontSize: '13px',
          fontWeight: 600,
          lineHeight: '24px',
          letterSpacing: '0.09px',
          paddingLeft: '2px',
          paddingRight: '2px',
          color: themeColors.gray700(),
        }}
      >
        {label}
      </span>
    </button>
  );
}

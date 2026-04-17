'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import PressHoverItem from '@/components/ui/PressHoverItem';

interface NavigationItemProps {
  icon: LucideIcon;
  label: string;
  sidebarOpen: boolean;
  onClick?: () => void;
  className?: string;
  usePrimaryColor?: boolean; // When true, uses primary color when sidebar is open
  isActive?: boolean; // When true, shows active state with secondary color (unless usePrimaryColor is true)
  disabled?: boolean; // When true, disables the button
}

function resolveNavigationColor(
  usePrimaryColor: boolean,
  sidebarOpen: boolean,
  isActive: boolean
): string | undefined {
  if (usePrimaryColor) {
    return sidebarOpen ? 'var(--color-primary-700)' : undefined;
  }
  if (isActive) return 'var(--color-secondary-600)';
  return undefined;
}

function resolveNavigationHoverBg(
  sidebarOpen: boolean,
  usePrimaryColor: boolean,
  isActive: boolean
): string | undefined {
  if (!sidebarOpen) return undefined;
  if (usePrimaryColor) return 'var(--color-primary-50)';
  if (isActive) return 'var(--color-secondary-100)';
  return undefined;
}

export default function NavigationItem({
  icon: Icon,
  label,
  sidebarOpen,
  onClick,
  className,
  usePrimaryColor = false,
  isActive = false,
  disabled = false,
}: NavigationItemProps) {
  const color = resolveNavigationColor(usePrimaryColor, sidebarOpen, isActive);
  const hoverBg = resolveNavigationHoverBg(sidebarOpen, usePrimaryColor, isActive);

  return (
    <PressHoverItem className="w-full">
      <button 
        className={cn(
          'flex items-center rounded-lg text-sm font-medium transition-colors w-full',
          'focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2',
          sidebarOpen ? 'w-full justify-start h-10' : 'w-10 h-10 justify-center',
          // Default styles when no custom color
          !color && 'text-gray-700 hover:bg-gray-100',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={disabled}
        style={{
          padding: '10px',
          gap: sidebarOpen ? '12px' : undefined,
          color: color || undefined,
          ...(hoverBg && {
            '--hover-bg': hoverBg,
          } as React.CSSProperties),
        }}
        onMouseEnter={(e) => {
          if (disabled || !hoverBg) return;
          e.currentTarget.style.backgroundColor = hoverBg;
        }}
        onMouseLeave={(e) => {
          if (disabled || !hoverBg) return;
          e.currentTarget.style.backgroundColor = '';
        }}
        title={label}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        <Icon 
          className="shrink-0" 
          style={{ 
            width: '20px', 
            height: '20px',
            color: color || undefined
          }} 
        />
        {sidebarOpen && (
          <span 
            className="flex-1 text-left truncate"
            style={{ 
              overflow: 'hidden',
              color: color || 'var(--color-gray-950)',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-manrope)',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '24px',
              textAlign: 'left',
            }}
          >
            {label}
          </span>
        )}
      </button>
    </PressHoverItem>
  );
}


'use client';

import { LucideIcon } from 'lucide-react';
import LayeredIcon from './layered-icon';
import { COLORS, TYPOGRAPHY, FONT_FAMILY, getTypographyStyle } from '@/lib/styles/constants';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  titleWidth?: string;
  descriptionWidth?: string;
  className?: string;
  actionButton?: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon,
  title,
  description,
  titleWidth,
  descriptionWidth = '440px',
  className,
  actionButton,
}: EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        paddingTop: '40px',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
        alignSelf: 'stretch',
      }}
    >
      {/* Layered icon */}
      <LayeredIcon icon={icon} />

      {/* Message section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          alignSelf: 'stretch',
        }}
      >
        {/* Main message */}
        <p
          style={{
            ...(titleWidth ? { width: titleWidth } : { alignSelf: 'stretch' }),
            ...getTypographyStyle('small', 'headline'),
            color: COLORS.lynch[500],
            textAlign: 'center',
          }}
        >
          {title}
        </p>

        {/* Sub message - only show when description is provided */}
        {description && (
          <p
            style={{
              width: descriptionWidth,
              ...getTypographyStyle('base', 'text'),
              color: COLORS.lynch[500],
              textAlign: 'center',
            }}
          >
            {description}
          </p>
        )}

        {/* Action button */}
        {actionButton && (
          <button
            onClick={actionButton.onClick}
            className={cn(
              'flex items-center justify-center cursor-pointer',
              'hover:opacity-90 transition-opacity'
            )}
            style={{
              padding: '0',
              border: 'none',
              background: 'transparent',
              borderRadius: '2px',
              gap: '8px',
            }}
          >
            <actionButton.icon
              size={20}
              style={{ color: '#7122f4' }}
            />
            <span
              style={{
                ...getTypographyStyle('base', 'text'),
                fontWeight: 600,
                color: '#7122f4',
              }}
            >
              {actionButton.label}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}


/**
 * Reusable Breadcrumb component
 */

'use client';

import { ReactNode } from 'react';
import { themeColors } from '@/lib/utils/theme';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <div className={cn('flex items-center', className)} style={{ gap: '4px' }}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center" style={{ gap: '4px' }}>
          {index > 0 && (
            <span
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                color: themeColors.gray500(),
                margin: '0 4px',
              }}
            >
              {' > '}
            </span>
          )}
          <button
            onClick={item.onClick}
            className="flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer"
            style={{
              padding: '0',
              gap: '4px',
              borderRadius: '2px',
              background: 'transparent',
              border: 'none',
            }}
          >
            {item.icon && (
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </span>
            )}
            <span
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: index === items.length - 1 ? 600 : 500,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                color: themeColors.gray700(),
              }}
            >
              {item.label}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}


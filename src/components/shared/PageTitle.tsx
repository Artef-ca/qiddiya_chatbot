/**
 * Reusable Page Title component
 * Standardizes page title styling
 */

'use client';

import { ReactNode } from 'react';
import { themeColors } from '@/lib/utils/theme';
import { getThemeTypography } from '@/lib/utils/theme';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

export function PageTitle({ children, size = 'medium', className, style }: PageTitleProps) {
  const sizeConfig = {
    small: getThemeTypography('headline', 'small'),
    medium: getThemeTypography('headline', 'medium'),
    large: getThemeTypography('headline', 'large'),
  };

  const config = sizeConfig[size];

  return (
    <h1
      className={cn(className)}
      style={{
        fontFamily: 'Manrope, var(--font-manrope)',
        fontSize: config.size,
        fontWeight: 500,
        lineHeight: config.lineHeight,
        letterSpacing: size === 'large' ? '-0.48px' : size === 'medium' ? '-0.27px' : '-0.12px',
        color: themeColors.gray700(),
        ...style,
      }}
    >
      {children}
    </h1>
  );
}


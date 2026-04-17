'use client';

import { ReactNode } from 'react';
import { getTypographyStyle, COLORS, FONT_FAMILY } from '@/lib/styles/constants';
import { cn } from '@/lib/utils';

type TypographyVariant = 'headline-small' | 'headline-medium' | 'headline-large' | 'text-base' | 'text-small' | 'text-tiny' | 'label';

interface TypographyProps {
  variant?: TypographyVariant;
  color?: string;
  className?: string;
  children: ReactNode;
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label';
  align?: 'left' | 'center' | 'right';
  weight?: 400 | 500 | 600 | 700;
  style?: React.CSSProperties;
}

export default function Typography({
  variant = 'text-base',
  color,
  className,
  children,
  as: Component = 'p',
  align,
  weight,
  style: customStyle,
  ...props
}: TypographyProps) {
  const [type, size] = variant.split('-') as ['headline' | 'text' | 'label', string];
  const typographyStyle = type === 'label' 
    ? { fontFamily: FONT_FAMILY.manrope, fontSize: '13px', fontWeight: 600, lineHeight: '24px' }
    : getTypographyStyle(size as any, type === 'headline' ? 'headline' : 'text');

  const style: React.CSSProperties = {
    ...typographyStyle,
    ...(color && { color }),
    ...(align && { textAlign: align }),
    ...(weight && { fontWeight: weight }),
    ...(customStyle || {}),
  };

  return (
    <Component className={cn(className)} style={style}>
      {children}
    </Component>
  );
}


'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PressHoverItemProps {
  children: ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function PressHoverItem({
  children,
  onClick,
  className,
  style,
}: PressHoverItemProps) {
  return (
    <motion.div
      whileHover={{
        y: 1,
        scale: 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 1200,
        damping: 28,
        mass: 0.2,
      }}
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer', className)}
      style={style}
    >
      {children}
    </motion.div>
  );
}


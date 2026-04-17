'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayeredIconProps {
  icon: LucideIcon;
  className?: string;
}

export default function LayeredIcon({ icon: Icon, className }: LayeredIconProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{
        width: '80px',
        height: '80px',
      }}
    >
      {/* End layer (bottom) - 80px x 80px, rotate(30deg) */}
      <div
        style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          aspectRatio: '1/1',
          transform: 'rotate(30deg)',
          borderRadius: '4px',
          opacity: 0.8,
          background: 'var(--Picton-Blue-200, #B6EBFF)',
        }}
      />

      {/* Second last layer - 64px x 64px, rotate(15deg) */}
      <div
        style={{
          position: 'absolute',
          width: '64px',
          height: '64px',
          aspectRatio: '1/1',
          transform: 'rotate(15deg)',
          borderRadius: '4px',
          opacity: 0.7,
          background: 'var(--Picton-Blue-100, #DEF4FF)',
        }}
      />

      {/* 3rd layer - 48px x 48px, no rotation */}
      <div
        style={{
          position: 'absolute',
          width: '48px',
          height: '48px',
          aspectRatio: '1/1',
          borderRadius: '4px',
          opacity: 0.6,
          background: 'var(--Picton-Blue-50, #EFFAFF)',
        }}
      />

      {/* Icon container - 32px x 32px */}
      <div
        style={{
          position: 'absolute',
          width: '32px',
          height: '32px',
          aspectRatio: '1/1',
          opacity: 0.8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Icon - 21.333px x 29.333px */}
        <Icon
          style={{
            width: '29.333px',
            height: '29.333px',
            stroke: 'var(--Picton-Blue-500, #0BC0FF)',
            fill: 'none',
          }}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
}


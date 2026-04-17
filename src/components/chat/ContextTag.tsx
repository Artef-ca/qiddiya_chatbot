'use client';

import { cn } from '@/lib/utils';
import { AtSign } from 'lucide-react';

interface ContextTagProps {
  onClick?: () => void;
  className?: string;
}

export default function ContextTag({ onClick, className }: ContextTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2',
        className
      )}
      style={{
        display: 'flex',
        width: '145px',
        height: '22px',
        padding: '3px var(--spacing-xs, 4px) 3px var(--spacing-sm, 6px)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '3px',
        borderRadius: 'var(--radius-sm, 6px)',
        border: '1px solid var(--Picton-Blue-200, #B6EBFF)',
        background: 'var(--Picton-Blue-50, #EFFAFF)',
        color: 'var(--Picton-Blue-600, #0093D4)',
      }}
    >
      <AtSign 
        style={{ 
          width: '12px',
          height: '12px',
          aspectRatio: '1/1',
          color: '#0093D4',
        }}
        aria-hidden="true"
      />
      <span 
        style={{ 
          color: 'var(--Picton-Blue-600, #0093D4)',
          textAlign: 'center',
          fontFamily: 'Manrope',
          fontSize: '10px',
          fontStyle: 'normal',
          fontWeight: 600,
          lineHeight: '16px',
          letterSpacing: '0.18px',
        }}
      >
        Link Dataset to Context
      </span>
    </button>
  );
}


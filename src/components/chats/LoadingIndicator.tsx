'use client';

import Image from 'next/image';
import { themeColors } from '@/lib/utils/theme';

interface LoadingIndicatorProps {
  text?: string;
}

export default function LoadingIndicator({ text = 'Loading chats...' }: LoadingIndicatorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '6px 32px',
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <Image
          src="/animated-spinner.svg"
          alt="Loading"
          width={20}
          height={20}
          style={{
            display: 'block',
            maxWidth: 'none',
            width: '100%',
            height: '100%',
          }}
        />
      </div>
      <p
        style={{
          fontFamily: 'Manrope, var(--font-manrope)',
          fontSize: '13px',
          fontWeight: 600,
          lineHeight: '24px',
          color: themeColors.secondary600(),
          letterSpacing: '0.09px',
          flexShrink: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}


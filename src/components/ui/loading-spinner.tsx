'use client';

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  text?: string;
}

export default function LoadingSpinner({
  className,
  size = 26,
  text
}: LoadingSpinnerProps) {
  return (
    <div 
      className={cn("flex items-center", className)}
      style={{
        paddingTop: '4px',
        paddingBottom: '50px',
        gap: '8px',
      }}
    >
      <img
        src="/animated-spinner.svg"
        alt="Loading spinner"
        width={size}
        height={size}
        style={{ margin: '0 5px' }}
        aria-hidden="true"
      />

      {text && (
        <span 
          className="font-semibold"
          style={{ 
            color: '#0075AB',
            fontFamily: 'Manrope, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '24px',
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

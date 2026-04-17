'use client';

interface TextHighlightProps {
  children: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
}

export function TextHighlight({ 
  children, 
  backgroundColor, 
  textColor,
  className 
}: TextHighlightProps) {
  return (
    <span
      className={className}
      style={{
        backgroundColor: backgroundColor || 'rgba(255, 243, 211, 1)', // Default yellow highlight
        color: textColor || 'inherit',
        padding: backgroundColor ? '2px 4px' : '0',
        borderRadius: '4px',
        fontWeight: backgroundColor ? 600 : 'inherit',
      }}
    >
      {children}
    </span>
  );
}

interface HighlightedTextProps {
  children: React.ReactNode;
  highlight?: 'yellow' | 'red' | 'green' | 'blue' | 'gray';
  color?: string;
}

export function HighlightedText({ children, highlight, color }: HighlightedTextProps) {
  const highlightColors = {
    yellow: 'rgba(255, 243, 211, 1)',
    red: 'rgba(254, 226, 226, 1)',
    green: 'rgba(209, 250, 229, 1)',
    blue: 'rgba(219, 234, 254, 1)',
    gray: 'rgba(243, 244, 246, 1)',
  };

  const textColors = {
    yellow: 'var(--Lynch-900, #2D3440)',
    red: 'var(--color-accent-red-700, #B91C1C)',
    green: 'var(--color-accent-green-700, #047857)',
    blue: 'var(--Picton-Blue-800, #00628D)',
    gray: 'var(--Lynch-700, #5A6573)',
  };

  return (
    <span
      style={{
        backgroundColor: highlight ? highlightColors[highlight] : undefined,
        color: color || (highlight ? textColors[highlight] : 'inherit'),
        padding: highlight ? '2px 4px' : '0',
        borderRadius: '4px',
        fontWeight: highlight ? 600 : 'inherit',
      }}
    >
      {children}
    </span>
  );
}


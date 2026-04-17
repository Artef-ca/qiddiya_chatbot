/**
 * Reusable gradient divider component
 * Used for visual separation in chat container
 */

interface GradientDividerProps {
  direction?: 'top' | 'bottom';
  width?: string;
  height?: string;
  position?: 'absolute' | 'relative';
  top?: string;
  left?: string;
  zIndex?: number;
  className?: string;
}

export function GradientDivider({
  direction = 'top',
  width = '800px',
  height = direction === 'top' ? '28px' : '30px',
  position = 'absolute',
  top = direction === 'top' ? '40px' : '-30px',
  left = '0',
  zIndex = direction === 'top' ? 5 : 11,
  className,
}: GradientDividerProps) {
  const gradientStyle = direction === 'top'
    ? 'linear-gradient(180deg, var(--color-gray-50, #F6F7F9) 16.66%, rgba(246, 247, 249, 0.90) 44.18%, rgba(246, 247, 249, 0.00) 99.65%)'
    : 'linear-gradient(0deg, var(--color-gray-50, #F6F7F9) 16.66%, rgba(246, 247, 249, 0.90) 44.18%, rgba(246, 247, 249, 0.00) 99.65%)';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        width,
        maxWidth: width,
        height,
        padding: '10px',
        alignItems: 'flex-start',
        gap: '10px',
        position,
        top,
        left,
        background: gradientStyle,
        zIndex,
        pointerEvents: 'none',
      }}
    />
  );
}


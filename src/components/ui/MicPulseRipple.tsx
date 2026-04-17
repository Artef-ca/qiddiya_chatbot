// 'use client';

// import { Mic } from 'lucide-react';
// import { cn } from '@/lib/utils';

// interface MicPulseRippleProps {
//   className?: string;
//   size?: number;
//   color?: string;
// }

// export default function MicPulseRipple({
//   className,
//   size = 35,
//   color = '#0093D4', // Secondary color (Picton Blue)
// }: MicPulseRippleProps) {
//   const containerSize = size * 1;
//   const centerOffset = containerSize / 2;
  
//   return (
//     <div
//       className={cn(
//         'relative flex items-center justify-center',
//         className
//       )}
//       style={{
//         width: `${containerSize}px`,
//         height: `${containerSize}px`,
//         minWidth: `${containerSize}px`,
//         minHeight: `${containerSize}px`,
//       }}
//       aria-label="Microphone listening"
//       role="status"
//     >
//       {/* Ripple Wave 1 */}
//       <div
//         className="absolute rounded-full mic-ripple-1"
//         style={{
//           width: `${size}px`,
//           height: `${size}px`,
//           border: `1px solid ${color}`,
//           top: `${centerOffset - size / 2}px`,
//           left: `${centerOffset - size / 2}px`,
//           boxSizing: 'border-box',
//         }}
//         aria-hidden="true"
//       />
      
//       {/* Ripple Wave 2 */}
//       <div
//         className="absolute rounded-full mic-ripple-2"
//         style={{
//           width: `${size}px`,
//           height: `${size}px`,
//           border: `1px solid ${color}`,
//           top: `${centerOffset - size / 2}px`,
//           left: `${centerOffset - size / 2}px`,
//           boxSizing: 'border-box',
//         }}
//         aria-hidden="true"
//       />
      
//       {/* Microphone Icon - Fixed Center */}
//       <div
//         className="absolute z-10 flex items-center justify-center"
//         style={{
//           width: `${size}px`,
//           height: `${size}px`,
//           top: `${centerOffset - size / 2}px`,
//           left: `${centerOffset - size / 2}px`,
//         }}
//       >
//         <Mic
//           size={size}
//           style={{
//             color: color,
//           }}
//           aria-hidden="true"
//         />
//       </div>
//     </div>
//   );
// }

'use client';

import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicPulseRippleProps {
  className?: string;
  size?: number;
  color?: string;
}

export default function MicPulseRipple({
  className,
  size = 24,
  color = '#0093D4',
}: MicPulseRippleProps) {
  const containerSize = size * 1;
  const centerOffset = containerSize / 2;
  
  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        className
      )}
      style={{
        width: `${containerSize}px`,
        height: `${containerSize}px`,
        minWidth: `${containerSize}px`,
        minHeight: `${containerSize}px`,
      }}
      aria-label="Microphone listening"
      role="status"
    >
      {/* Ripple Wave 1 */}
      <div
        className="absolute rounded-full mic-ripple-1"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `1.6px solid ${color}`,
          top: `${centerOffset - size / 2}px`,
          left: `${centerOffset - size / 2}px`,
          boxSizing: 'border-box',
        }}
        aria-hidden="true"
      />
      
      {/* Ripple Wave 2 */}
      <div
        className="absolute rounded-full mic-ripple-2"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `1.6px solid ${color}`,
          top: `${centerOffset - size / 2}px`,
          left: `${centerOffset - size / 2}px`,
          boxSizing: 'border-box',
        }}
        aria-hidden="true"
      />

      {/* Mic Icon */}
      <div
        className="absolute z-10 flex items-center justify-center"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          top: `${centerOffset - size / 2}px`,
          left: `${centerOffset - size / 2}px`,
        }}
      >
        <Mic
          size={size}
          style={{
            color: color,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

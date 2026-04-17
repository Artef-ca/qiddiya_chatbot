'use client';

import { PanelLeftOpen , PanelLeftClose ,  } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarToggleProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export default function SidebarToggle({
  isOpen,
  onClick,
  className,
}: SidebarToggleProps) {  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center transition-all duration-200 cursor-pointer',
        'active:scale-95 z-10 relative rounded-lg',
        'focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2',
        className
      )}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      type="button"
    >
      <div className="relative flex items-center justify-center" style={{ width: '20px', height: '20px' }}>
        {/* Chevron icon - points left when open, right when closed */}
        {/* <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center"> */}
          {isOpen ? (
            < PanelLeftClose className="text-gray-700 shrink-0" style={{ width: '20px', height: '20px' }} />
          ) : (
            < PanelLeftOpen className="text-gray-700 shrink-0" style={{ width: '20px', height: '20px' }} />
          )}
        {/* </div> */}
      </div>
    </button>
  );
}


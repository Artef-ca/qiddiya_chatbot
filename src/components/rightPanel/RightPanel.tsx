'use client';

import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRightPanelOpen } from '@/store/slices/uiSlice';
import { cn } from '@/lib/utils';
import PinBoard from './PinBoard';

export default function RightPanel() {
  const dispatch = useAppDispatch();
  const { rightPanelOpen } = useAppSelector((state) => state.ui);
  const activeTab = 'pinboard' as const;

  const handleClose = () => {
    dispatch(setRightPanelOpen(false));
  };

  return (
    <aside
      className={cn(
        'fixed z-50 flex flex-col transition-all duration-300 ease-in-out shadow-lg',
        // Mobile (< 768px): full width overlay, hide completely when closed
        rightPanelOpen 
          ? 'translate-x-0 w-full right-0 top-0 bottom-0 h-screen' 
          : 'translate-x-full w-full right-0 top-0 bottom-0 h-screen',
        // Tablet (768px - 1023px): fixed width with margins, slides in/out
        'md:right-4 md:top-4 md:bottom-4 md:h-auto md:rounded-lg md:w-[558px]',
        rightPanelOpen ? 'md:translate-x-0' : 'md:translate-x-full',
        // Desktop (>= 1024px): fixed width, positioned at edge, slides in/out
        'lg:right-0 lg:top-0 lg:bottom-0 lg:h-screen lg:rounded-none lg:w-[558px]',
        rightPanelOpen ? 'lg:translate-x-0' : 'lg:translate-x-full'
      )}
      style={{
        background: 'var(--Lynch-100, #ECEEF2)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
      role="complementary"
      aria-label="Right Panel"
    >
      {/* Left edge shadow element - spans full height */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '6px',
          pointerEvents: 'none',
          zIndex: 15,
          background: 'linear-gradient(to right, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.1) 15%, rgba(0, 0, 0, 0.06) 35%, rgba(0, 0, 0, 0.03) 55%, rgba(0, 0, 0, 0.01) 75%, transparent 100%)',
        }}
      />
      {/* Header */}
      <div
        style={{
          display: 'flex',
          width: '558px',
          padding: '20px 16px 16px 40px',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'linear-gradient(0deg, rgba(236, 238, 242, 0.10) 0%, var(--Lynch-100, #ECEEF2) 22.16%)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'pinboard'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Pin Board
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed opacity-70"
            aria-label="Dataset Explorer (disabled)"
            title="Dataset Explorer is currently disabled"
          >
            Dataset Explorer
          </button>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
          aria-label="Close panel"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ marginTop: '76px', background: 'var(--Lynch-100, #ECEEF2)' }}>
        {activeTab === 'pinboard' && <PinBoard />}
      </div>
    </aside>
  );
}


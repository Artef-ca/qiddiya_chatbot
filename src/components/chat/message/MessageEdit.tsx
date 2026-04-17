'use client';

import { Check, X } from 'lucide-react';

interface MessageEditProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function MessageEdit({
  value,
  onChange,
  onSave,
  onCancel,
  textareaRef,
}: MessageEditProps) {
  return (
    <div 
      className="w-full"
      style={{
        display: 'flex',
        padding: '8px',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '10px',
        flex: '1 0 0',
        borderRadius: '6px',
        background: '#FFF',
        boxShadow: '0 1px 4px 0 var(--Lynch-200, #D5D9E2) inset',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-0 bg-transparent border-0 rounded-none focus-visible:outline-none resize-none overflow-hidden"
        style={{
          minHeight: '1.5em',
          lineHeight: '22px',
          color: 'var(--Lynch-800, #3A4252)',
          fontFamily: 'Manrope',
          fontSize: '14px',
          fontStyle: 'normal',
          fontWeight: 600,
        }}
        rows={1}
        autoFocus
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
      />
      {/* Action icons */}
      <div 
        className="flex items-center gap-2 self-end"
        style={{
          width: '100%',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={onCancel}
          className="flex items-center justify-center transition-colors hover:opacity-70 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
          style={{
            padding: '4px',
            borderRadius: '4px',
          }}
          aria-label="Cancel edit"
          title="Cancel"
        >
          <X 
            style={{
              width: '16px',
              height: '16px',
              color: 'var(--Lynch-700, #434E61)'
            }} 
          />
        </button>
        <button
          onClick={onSave}
          className="flex items-center justify-center transition-colors hover:opacity-70 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
          style={{
            padding: '4px',
            borderRadius: '4px',
          }}
          aria-label="Save edit"
          title="Save"
        >
          <Check 
            style={{
              width: '16px',
              height: '16px',
              color: 'var(--Electric-Violet-600, #7122F4)'
            }} 
          />
        </button>
      </div>
    </div>
  );
}


'use client';

import React from 'react';

interface ParagraphDividerProps {
  children: React.ReactNode;
}

export function ParagraphDivider({ children }: ParagraphDividerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '8px',
        marginTop: '16px',
      }}
    >
      {React.Children.map(children, (child, index) => (
        <div key={index}>
          {child}
          {index < React.Children.count(children) - 1 && (
            <div
              style={{
                height: '1px',
                background: 'var(--Lynch-200, #D5D9E2)',
                marginTop: '16px',
                marginBottom: '16px',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}


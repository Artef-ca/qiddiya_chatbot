'use client';

import { cssVar, CSS_VARS } from '@/lib/utils/css';
import type { MarkdownCodeProps } from '../types';

export function Code({ children, className }: MarkdownCodeProps) {
  const isInline = !className;
  if (isInline) {
    return (
      <code 
        className="rounded px-1.5 py-0.5 text-sm font-mono"
        style={{
          backgroundColor: cssVar(CSS_VARS.codeInlineBackground),
          color: cssVar(CSS_VARS.codeInlineText)
        }}
      >
        {children}
      </code>
    );
  }
  return (
    <code className={className}>{children}</code>
  );
}

export function Pre({ children }: { children?: React.ReactNode }) {
  return (
    <pre 
      className="mb-3 overflow-x-auto rounded-lg p-4 text-sm last:mb-0"
      style={{
        backgroundColor: cssVar(CSS_VARS.codeBackground),
        color: cssVar(CSS_VARS.codeText)
      }}
    >
      {children}
    </pre>
  );
}


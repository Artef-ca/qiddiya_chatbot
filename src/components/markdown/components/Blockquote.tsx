'use client';

import type { MarkdownComponentProps } from '../types';

export function Blockquote({ children }: MarkdownComponentProps) {
  return (
    <blockquote className="my-3 pl-4 border-l-4 border-gray-300 italic text-gray-600">
      {children}
    </blockquote>
  );
}


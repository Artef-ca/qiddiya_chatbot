'use client';

import type { MarkdownHeadingProps } from '../types';

export function Heading1({ children }: MarkdownHeadingProps) {
  return (
    <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0" style={{
      fontFamily: 'Manrope',
      fontWeight: 700,
      color: 'var(--Lynch-900, #2D3440)'
    }}>{children}</h1>
  );
}

export function Heading2({ children }: MarkdownHeadingProps) {
  return (
    <h2 className="text-xl font-semibold mb-2 mt-3 first:mt-0" style={{
      fontFamily: 'Manrope',
      fontWeight: 600,
      color: 'var(--Lynch-900, #2D3440)'
    }}>{children}</h2>
  );
}

export function Heading3({ children }: MarkdownHeadingProps) {
  return (
    <h3 className="text-lg font-semibold mb-2 mt-3 first:mt-0" style={{
      fontFamily: 'Manrope',
      fontWeight: 600,
      color: 'var(--Lynch-900, #2D3440)'
    }}>{children}</h3>
  );
}

export function Heading4({ children }: MarkdownHeadingProps) {
  return (
    <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0" style={{
      fontFamily: 'Manrope',
      fontWeight: 600,
      color: 'var(--Lynch-900, #2D3440)'
    }}>{children}</h4>
  );
}


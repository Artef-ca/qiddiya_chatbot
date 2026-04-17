'use client';

import type { MarkdownComponentProps } from '../types';
import { listTextStyle } from '../styles';

export function UnorderedList({ children }: MarkdownComponentProps) {
  return (
    <ul 
      className="mb-3 list-disc last:mb-0 space-y-1" 
      style={{
        ...listTextStyle,
        paddingLeft: '24px',
        marginLeft: '0',
        marginTop: '0',
        marginBottom: '0'
      }}
    >
      {children}
    </ul>
  );
}

export function OrderedList({ children }: MarkdownComponentProps) {
  return (
    <ol 
      className="mb-3 list-decimal last:mb-0 space-y-1" 
      style={{
        ...listTextStyle,
        paddingLeft: '24px',
        marginLeft: '0',
        marginTop: '0',
        marginBottom: '0'
      }}
    >
      {children}
    </ol>
  );
}

export function ListItem({ children }: MarkdownComponentProps) {
  return (
    <li style={listTextStyle}>
      {children}
    </li>
  );
}


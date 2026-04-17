import type { ReactNode } from 'react';

/**
 * Extract text content from React nodes recursively
 */
export function extractText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return props?.children ? extractText(props.children) : '';
  }
  return '';
}

/**
 * Check if text content indicates a warning/error
 */
export function isWarningHeader(text: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes("couldn't") ||
    lowerText.includes("could not") ||
    lowerText.includes("error") ||
    lowerText.includes("warning") ||
    lowerText.includes("failed") ||
    lowerText.includes("unable")
  );
}

/**
 * Check if text is a suggestion header
 */
export function isSuggestionHeader(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/:\s*$/, '');
  return normalized === 'to go further';
}

/**
 * Check if text is a regular header (ends with colon)
 */
export function isRegularHeader(text: string): boolean {
  return text.trim().endsWith(':') && text.length < 100;
}


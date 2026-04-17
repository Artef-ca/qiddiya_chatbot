'use client';

import { useEffect, useRef, RefObject } from 'react';
import { CONSTANTS } from '@/lib/utils/constants';

interface UseTextareaAutoResizeOptions {
  value: string;
  minHeight?: number;
  maxHeight?: number;
  onScrollbarChange?: (showScrollbar: boolean) => void;
}

interface UseTextareaAutoResizeReturn {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

/**
 * Custom hook for auto-resizing textarea elements
 * Automatically adjusts height based on content and shows/hides scrollbar
 */
export function useTextareaAutoResize(
  options: UseTextareaAutoResizeOptions
): UseTextareaAutoResizeReturn {
  const {
    value,
    minHeight = 24,
    maxHeight = CONSTANTS.MAX_TEXTAREA_HEIGHT,
    onScrollbarChange,
  } = options;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;

      // Notify about scrollbar visibility
      if (onScrollbarChange) {
        onScrollbarChange(scrollHeight > maxHeight);
      }
    }
  }, [value, minHeight, maxHeight, onScrollbarChange]);

  return { textareaRef };
}


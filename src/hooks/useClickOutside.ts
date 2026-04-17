'use client';

import { useEffect, RefObject } from 'react';

/**
 * Custom hook to detect clicks outside of a referenced element(s)
 * Useful for closing dropdowns, modals, etc.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null> | Array<RefObject<HTMLElement | null>>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Handle array of refs
      if (Array.isArray(ref)) {
        const isClickInside = ref.some(r => r.current && r.current.contains(event.target as Node));
        if (isClickInside) {
          return;
        }
      } else {
        // Handle single ref
        if (ref.current && ref.current.contains(event.target as Node)) {
          return;
        }
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}


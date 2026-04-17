'use client';

import { useSyncExternalStore } from 'react';

/**
 * Subscribes to window.matchMedia. SSR snapshot is false; updates after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onStoreChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onStoreChange);
    return () => mql.removeEventListener('change', onStoreChange);
  };
  const getSnapshot = () =>
    typeof window !== 'undefined' && window.matchMedia(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

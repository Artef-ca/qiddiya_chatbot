'use client';

import { useState, useCallback } from 'react';

interface UseClipboardOptions {
  timeout?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  isSupported: boolean;
}

/**
 * Custom hook for clipboard operations
 * Provides a clean API for copying text to clipboard with feedback
 */
export function useClipboard(
  options: UseClipboardOptions = {}
): UseClipboardReturn {
  const { timeout = 2000, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);

  const isSupported = typeof navigator !== 'undefined' && 'clipboard' in navigator;

  const copy = useCallback(
    async (text: string) => {
      if (!isSupported) {
        const error = new Error('Clipboard API not supported');
        onError?.(error);
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        onSuccess?.();

        if (timeout > 0) {
          setTimeout(() => setCopied(false), timeout);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to copy text');
        setCopied(false);
        onError?.(error);
        console.error('Failed to copy to clipboard:', error);
      }
    },
    [isSupported, timeout, onSuccess, onError]
  );

  return {
    copied,
    copy,
    isSupported: !!isSupported,
  };
}


/**
 * Custom hook for managing auto-scroll behavior in chat containers
 * Extracted from ChatContainer to improve code organization
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoScrollOptions {
  isStreaming: boolean;
  messagesLength: number;
  lastMessageContentLength: number;
}

interface UseAutoScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  isAtBottom: boolean;
  showScrollButton: boolean;
  scrollToBottom: (smooth?: boolean) => void;
}

export function useAutoScroll({
  isStreaming,
  messagesLength,
  lastMessageContentLength,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const autoScrollEnabledRef = useRef(true);
  const previousScrollTopRef = useRef<number>(0);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkIfAtBottom = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const threshold = 100; // 100px threshold to consider "at bottom"
    const currentScrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const isNearBottom = scrollHeight - currentScrollTop - clientHeight <= threshold;

    // Detect if user is scrolling up
    if (currentScrollTop < previousScrollTopRef.current) {
      // User is scrolling up
      isUserScrollingRef.current = true;
      autoScrollEnabledRef.current = false;

      // Clear any existing timeout
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }

      // Reset user scrolling flag after a delay (user stopped scrolling)
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
        // Only re-enable if they're at the bottom
        if (isNearBottom) {
          autoScrollEnabledRef.current = true;
        }
      }, 150);
    } else if (currentScrollTop > previousScrollTopRef.current && isNearBottom) {
      // User scrolled down and is at bottom - re-enable auto-scroll
      isUserScrollingRef.current = false;
      autoScrollEnabledRef.current = true;
    }

    previousScrollTopRef.current = currentScrollTop;
    setIsAtBottom(isNearBottom);
    setShowScrollButton(!isNearBottom);

    // Only update auto-scroll if user is not actively scrolling
    if (!isUserScrollingRef.current) {
      autoScrollEnabledRef.current = isNearBottom;
    }
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkIfAtBottom();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    checkIfAtBottom();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [checkIfAtBottom]);

  // Auto-scroll only when at bottom and messages change (and user is not scrolling)
  useEffect(() => {
    if (autoScrollEnabledRef.current && isAtBottom && !isUserScrollingRef.current) {
      // Use a small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        if (autoScrollEnabledRef.current && !isUserScrollingRef.current) {
          scrollToBottom(false); // Use instant scroll for auto-scroll during streaming
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [messagesLength, isAtBottom, scrollToBottom]);

  // Handle continuous auto-scroll during streaming (only if user is not scrolling)
  useEffect(() => {
    if (!isStreaming || !autoScrollEnabledRef.current || !isAtBottom || isUserScrollingRef.current) {
      return;
    }

    // Use requestAnimationFrame for smooth continuous scrolling during streaming
    let rafId: number;
    const scrollInterval = setInterval(() => {
      if (autoScrollEnabledRef.current && isAtBottom && !isUserScrollingRef.current) {
        rafId = requestAnimationFrame(() => {
          if (autoScrollEnabledRef.current && !isUserScrollingRef.current) {
            scrollToBottom(false);
          }
        });
      }
    }, 100); // Check every 100ms during streaming

    return () => {
      clearInterval(scrollInterval);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isStreaming, isAtBottom, scrollToBottom]);

  // Watch for content changes in the last message (for streaming)
  useEffect(() => {
    if (!lastMessageContentLength || !autoScrollEnabledRef.current || !isAtBottom || isUserScrollingRef.current) {
      return;
    }

    // Small delay to allow DOM to update
    const timeoutId = setTimeout(() => {
      if (autoScrollEnabledRef.current && isAtBottom && !isUserScrollingRef.current) {
        scrollToBottom(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [lastMessageContentLength, isAtBottom, scrollToBottom]);

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom(true);
    setIsAtBottom(true);
    setShowScrollButton(false);
    autoScrollEnabledRef.current = true;
    isUserScrollingRef.current = false;
  }, [scrollToBottom]);

  return {
    messagesEndRef: messagesEndRef as React.RefObject<HTMLDivElement>,
    scrollContainerRef: scrollContainerRef as React.RefObject<HTMLDivElement>,
    isAtBottom,
    showScrollButton,
    scrollToBottom: handleScrollToBottom,
  };
}


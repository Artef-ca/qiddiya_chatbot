'use client';

import { useState, useEffect } from 'react';

/** Chars to reveal per tick for typing effect (~125 chars/sec) */
const CHARS_PER_TICK = 5;
/** Ms between updates */
const TICK_MS = 40;

interface TypingContentProps {
  content: string;
  isStreaming: boolean;
  children: (displayedContent: string) => React.ReactNode;
}

/**
 * Wraps content with a typing animation when streaming.
 * When isStreaming is true, reveals content character by character.
 * When isStreaming becomes false, shows full content immediately.
 * Works even when server sends all content at once (buffered).
 */
export function TypingContent({ content, isStreaming, children }: TypingContentProps) {
  const [displayedLength, setDisplayedLength] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(content.length);
      return;
    }

    const targetLength = content.length;
    if (displayedLength >= targetLength) return;

    const id = setInterval(() => {
      setDisplayedLength((prev) => {
        const next = Math.min(prev + CHARS_PER_TICK, targetLength);
        if (next >= targetLength) clearInterval(id);
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [content, isStreaming]);

  // Sync when content grows during streaming (effect runs on content change)
  useEffect(() => {
    if (content.length === 0) setDisplayedLength(0);
  }, [content.length]);

  const displayedContent = isStreaming ? content.slice(0, displayedLength) : content;
  return <>{children(displayedContent)}</>;
}

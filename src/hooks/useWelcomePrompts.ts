import { useState, useEffect } from 'react';
import { welcomeQuestions } from '@/data/welcomeQuestions';

const WELCOME_PROMPTS_KEY = 'welcome_prompts';

/**
 * Randomly selects N unique items from an array using Fisher-Yates shuffle
 */
function getRandomItems<T>(array: readonly T[], count: number): T[] {
  const shuffled = [...array];
  // Fisher-Yates shuffle for better randomness
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Generate a stable ID from text content (for hydration safety)
 */
function generateStableId(text: string, index: number): string {
  // Create a simple hash from the text for a stable ID
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `prompt-${index}-${Math.abs(hash)}`;
}

/**
 * Generate prompts with stable IDs
 */
function generatePrompts(selectedQuestions: string[]) {
  return selectedQuestions.map((text, index) => ({
    id: generateStableId(text, index),
    text,
  }));
}

function getStoredPrompts(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(WELCOME_PROMPTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length === 3 && parsed.every((x) => typeof x === 'string')) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function setStoredPrompts(questions: string[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(WELCOME_PROMPTS_KEY, JSON.stringify(questions));
  } catch {
    // ignore
  }
}

function clearStoredPrompts() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(WELCOME_PROMPTS_KEY);
  } catch {
    // ignore
  }
}

/** Detect if this page load was a refresh (so we show new questions). */
function isPageReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const nav = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === 'reload';
  } catch {
    return false;
  }
}

export function useWelcomePrompts() {
  // Start with empty array to avoid hydration mismatch
  const [prompts, setPrompts] = useState<Array<{ id: string; text: string }>>([]);

  useEffect(() => {
    // Refresh: clear stored prompts so we show new questions
    if (isPageReload()) {
      clearStoredPrompts();
    }

    const stored = getStoredPrompts();
    const selectedQuestions = stored ?? getRandomItems(welcomeQuestions as readonly string[], 3);
    if (!stored) {
      setStoredPrompts(selectedQuestions);
    }
    setPrompts(generatePrompts(selectedQuestions));

    // When user leaves welcome (e.g. to chat or New chat), clear after a short delay.
    // Next time they see welcome they get new questions. The delay avoids clearing
    // during the brief transition when clicking a card (so questions don’t flicker).
    return () => {
      setTimeout(() => clearStoredPrompts(), 500);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user returns to this tab from another browser tab, clear so next time
  // they see the welcome screen they get fresh questions.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearStoredPrompts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return {
    greeting: undefined,
    subtitle: 'Where should we start?',
    prompts,
    isLoading: false,
    error: null,
  };
}


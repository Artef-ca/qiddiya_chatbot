'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { extractSpeechText } from '@/lib/utils/textExtraction';
import { detectBrowser, getBrowserSpecificError, supportsSpeechSynthesis } from '@/lib/utils/browserDetection';

interface UseSpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSupported: boolean;
}

/**
 * Custom hook for speech synthesis (text-to-speech)
 * Provides a clean API for using the Web Speech Synthesis API
 */
export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const {
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    lang = 'en-US',
    onEnd,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef(false); // Ref to track speaking state for immediate access

  // Detect browser for compatibility handling
  const browser = useMemo(() => detectBrowser(), []);

  // Check for browser support
  const isSupported = useMemo(() => {
    return supportsSpeechSynthesis();
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      utteranceRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        // Safari has issues with pause/resume, so we handle it differently
        if (browser.name === 'safari') {
          // Safari may not properly support pause/resume
          // We'll still try but handle errors gracefully
          const synth = window.speechSynthesis;
          if (synth.speaking && !synth.paused) {
            synth.pause();
          }
        } else {
          window.speechSynthesis.pause();
        }
      } catch (error) {
        console.warn('Error pausing speech synthesis:', error);
        // If pause fails, we can stop instead for better UX
        if (browser.name === 'safari') {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          utteranceRef.current = null;
        }
      }
    }
  }, [browser]);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        const synth = window.speechSynthesis;
        // Safari has issues with resume, check if actually paused
        if (browser.name === 'safari') {
          if (synth.paused) {
            synth.resume();
          }
        } else {
          synth.resume();
        }
      } catch (error) {
        console.warn('Error resuming speech synthesis:', error);
        // If resume fails, we might need to restart
        // This is a known Safari quirk
      }
    }
  }, [browser]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        console.warn('Speech synthesis is not supported in this browser');
        return;
      }

      if (!text || !text.trim()) {
        console.warn('Cannot speak empty text');
        return;
      }

      // Stop any ongoing speech first using ref for immediate check
      if (isSpeakingRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        utteranceRef.current = null;
      } else {
        // Cancel any pending utterances to ensure clean state
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }

      try {
        // Extract plain text optimized for speech synthesis
        const cleanText = extractSpeechText(text);

        if (!cleanText || !cleanText.trim()) {
          console.warn('Text is empty after cleaning');
          return;
        }

        // Check if speech synthesis is available
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          console.error('Speech synthesis API is not available');
          onError?.(new Error('Speech synthesis API is not available'));
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Set properties with validation
        utterance.rate = Math.max(0.1, Math.min(10, rate));
        utterance.pitch = Math.max(0, Math.min(2, pitch));
        utterance.volume = Math.max(0, Math.min(1, volume));
        utterance.lang = lang || 'en-US';

        // Browser-specific handling
        // Safari may have issues with certain voice properties
        if (browser.name === 'safari') {
          // Safari sometimes ignores pitch, so we validate it
          if (isNaN(utterance.pitch) || utterance.pitch < 0) {
            utterance.pitch = 1.0;
          }
        }

        utterance.onend = () => {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          utteranceRef.current = null;
          onEnd?.();
        };

        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
          // Better error handling with type safety
          const errorType = event.error;
          const errorTypeStr = errorType ? String(errorType) : '';
          const errorTypeLower = errorTypeStr.toLowerCase();

          setIsSpeaking(false);
          isSpeakingRef.current = false;
          utteranceRef.current = null;

          // Only log and call onError if it's a real error (not cancelled or interrupted)
          // These are expected when user stops speech manually
          // Check for various forms of cancellation/interruption
          const isExpectedError =
            errorTypeLower === 'interrupted' ||
            errorTypeLower === 'canceled' ||
            errorTypeLower === 'cancelled' ||
            errorTypeStr === '' ||
            !errorType;

          if (!isExpectedError) {
            // Get browser-specific error message
            const errorMessage = getBrowserSpecificError(browser, 'speech-synthesis', errorTypeStr);

            // Log detailed error information for debugging (only for real errors)
            console.error('Speech synthesis error:', {
              error: errorType,
              type: event.type,
              charIndex: event.charIndex,
              charLength: event.charLength,
              elapsedTime: event.elapsedTime,
              name: event.name,
              browser: browser.name,
            });

            onError?.(new Error(errorMessage));
          }
          // Silently handle canceled/interrupted/empty errors (user action or browser quirk)
        };

        utteranceRef.current = utterance;

        // Use try-catch for speak() as it can throw in some browsers
        try {
          // Set speaking state BEFORE calling speak() to ensure immediate UI update
          // This ensures the icon changes immediately when user clicks
          setIsSpeaking(true);
          isSpeakingRef.current = true;

          // Now call speak() - if it fails, the error handler will reset the state
          window.speechSynthesis.speak(utterance);
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error('Unknown error');
          const errorMessage = getBrowserSpecificError(browser, 'speech-synthesis') ||
            errorObj.message || 'Failed to start speech synthesis';

          console.error('Failed to start speech synthesis:', {
            error: errorObj,
            browser: browser.name,
            message: errorMessage,
          });

          setIsSpeaking(false);
          isSpeakingRef.current = false;
          utteranceRef.current = null;
          onError?.(new Error(errorMessage));
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        const errorMessage = getBrowserSpecificError(browser, 'speech-synthesis') ||
          errorObj.message || 'Failed to prepare speech synthesis';

        console.error('Error preparing speech synthesis:', {
          error: errorObj,
          browser: browser.name,
          message: errorMessage,
        });

        setIsSpeaking(false);
        isSpeakingRef.current = false;
        utteranceRef.current = null;
        onError?.(new Error(errorMessage));
      }
    },
    [isSupported, rate, pitch, volume, lang, onEnd, onError, browser]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isSpeaking,
    speak,
    stop,
    pause,
    resume,
    isSupported: !!isSupported,
  };
}


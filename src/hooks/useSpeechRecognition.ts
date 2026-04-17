'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { detectBrowser, getBrowserSpecificError, getSpeechRecognitionClass, supportsSpeechRecognition } from '@/lib/utils/browserDetection';

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  startListening: (initialText?: string) => void;
  stopListening: () => void;
  transcript: string;
  error: string | null;
  isSupported: boolean;
}

/**
 * Custom hook for speech recognition
 * Provides a clean API for using the Web Speech Recognition API
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTranscriptRef = useRef<string>('');
  const shouldAutoRestartRef = useRef<boolean>(false);
  const userStoppedRef = useRef<boolean>(false);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const onResultRef = useRef(onResult);

  // Keep onResultRef in sync so we don't recreate recognition on every render
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Detect browser for compatibility handling
  const browser = useMemo(() => detectBrowser(), []);

  // Check for browser support with browser-specific checks
  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;

    // Use browser detection for more accurate support check
    if (!supportsSpeechRecognition(browser)) return false;

    // Check if API is actually available
    return getSpeechRecognitionClass() !== null;
  }, [browser]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      shouldAutoRestartRef.current = false;
      userStoppedRef.current = true;
      setIsListening((currentActive) => {
        if (currentActive) {
          try {
            // Use abort() instead of stop() - abort immediately cancels without processing
            // buffered audio, whereas stop() allows results to continue arriving
            recognitionRef.current?.abort();
            // Keep the transcript when stopping so user can see/edit what was transcribed
            setTranscript((currentTranscript) => {
              baseTranscriptRef.current = currentTranscript;
              return currentTranscript;
            });
          } catch (err) {
            console.error('Error stopping speech recognition:', err);
          }
        }
        return false;
      });
    }
  }, []);

  // Store stopListening in ref for use in callbacks
  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    // Set maxAlternatives to 1 for better performance
    // This ensures we get results faster
    if ('maxAlternatives' in recognition) {
      // Type assertion needed as maxAlternatives is not in the interface but exists in some browsers
      (recognition as SpeechRecognition & { maxAlternatives?: number }).maxAlternatives = 1;
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Ignore any late-arriving results after user has requested stop
      if (userStoppedRef.current) return;

      let interimTranscript = '';

      // Process only NEW results (from resultIndex) - appending to baseTranscriptRef.
      // Per Web Speech API spec: resultIndex = first result that changed in this event.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          // Add space between phrases; transcript may not include leading space
          const separator = baseTranscriptRef.current ? ' ' : '';
          baseTranscriptRef.current = (baseTranscriptRef.current + separator + transcript).trim();
        } else {
          interimTranscript += transcript;
        }
      }

      // Display: all finals + current interim (for live feedback as user speaks)
      const displayTranscript = interimTranscript
        ? (baseTranscriptRef.current ? baseTranscriptRef.current + ' ' : '') + interimTranscript.trim()
        : baseTranscriptRef.current;

      setTranscript(displayTranscript);
      onResultRef.current?.(displayTranscript, !interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Handle "aborted" as a non-critical event (happens when recognition is stopped)
      if (event.error === 'aborted') {
        // This is expected when stopping recognition, don't treat as error
        // Only log if we're still supposed to be listening (unexpected abort)
        if (shouldAutoRestartRef.current) {
          console.warn('Speech recognition aborted unexpectedly, will attempt to restart');
        }
        // Don't stop listening or set error for aborted
        return;
      }

      // Handle "no-speech" as a non-critical warning
      if (event.error === 'no-speech') {
        // Don't stop for no-speech, let it continue listening
        // This happens when there's silence, which is normal
        return;
      } else if (event.error === 'audio-capture') {
        const errorMsg = getBrowserSpecificError(browser, 'speech-recognition', 'audio-capture');
        console.warn(errorMsg);
        setError(errorMsg);
        if (stopListeningRef.current) {
          stopListeningRef.current();
        }
      } else if (event.error === 'not-allowed') {
        const errorMsg = getBrowserSpecificError(browser, 'speech-recognition', 'not-allowed');
        console.error(errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
        if (stopListeningRef.current) {
          stopListeningRef.current();
        }
      } else if (event.error === 'network') {
        // Network errors can be temporary, so we'll retry instead of stopping immediately
        console.warn('Network error detected, will attempt to reconnect...');

        // Don't stop listening immediately - let it try to recover
        // The onend handler will attempt to restart
        // Only set error message, don't stop listening
        const errorMsg = 'Network connection issue. Attempting to reconnect...';
        setError(errorMsg);
        // Don't call onError for network issues as they might be temporary
        // Don't stop listening - let the auto-restart mechanism handle it
        // This allows the recognition to recover from temporary network issues
      } else if (event.error === 'service-not-allowed') {
        const errorMsg = getBrowserSpecificError(browser, 'speech-recognition', 'not-allowed');
        console.error(errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
        if (stopListeningRef.current) {
          stopListeningRef.current();
        }
      } else {
        // For other errors, log but don't necessarily stop
        // Some errors are recoverable
        const errorMsg = getBrowserSpecificError(browser, 'speech-recognition', event.error);
        console.warn('Speech recognition warning:', event.error, event.message);
        // Only set error for critical errors, not warnings
        if (event.error !== 'bad-grammar' && event.error !== 'language-not-supported') {
          setError(errorMsg);
          onError?.(errorMsg);
        }
      }
    };

    recognition.onend = () => {
      userStoppedRef.current = false;
      // Only auto-restart if we should (user hasn't manually stopped)
      if (shouldAutoRestartRef.current) {
        // Keep the listening state as true during restart
        // This ensures the UI shows it's still listening
        setIsListening(true);

        // Use a small delay to ensure the recognition object is ready
        setTimeout(() => {
          if (recognitionRef.current && shouldAutoRestartRef.current) {
            try {
              // Check if recognition is not already started
              recognitionRef.current.start();
            } catch (err) {
              const errorObj = err as Error;
              // InvalidStateError means it's already started, which is fine
              if (errorObj.name === 'InvalidStateError') {
                // Recognition is already running, that's okay
                return;
              }
              // For other errors, log and try again after a longer delay
              console.warn('Error restarting speech recognition, will retry:', err);
              setTimeout(() => {
                if (recognitionRef.current && shouldAutoRestartRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (retryErr) {
                    console.error('Failed to restart speech recognition after retry:', retryErr);
                    shouldAutoRestartRef.current = false;
                    setIsListening(false);
                  }
                }
              }, 500);
            }
          }
        }, 50); // Reduced delay for faster restart
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, [isSupported, lang, continuous, interimResults, onError, browser]);

  const startListening = useCallback((initialText = '') => {
    if (!isSupported) {
      const errorMsg = getBrowserSpecificError(browser, 'speech-recognition');
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        userStoppedRef.current = false;
        // Use initialText to append to existing content (e.g. when resuming after pause)
        baseTranscriptRef.current = initialText.trim();
        setTranscript(baseTranscriptRef.current);
        onResultRef.current?.(baseTranscriptRef.current, true);
        shouldAutoRestartRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        const errorObj = err as Error;
        if (errorObj.name === 'InvalidStateError' && errorObj.message?.includes('already started')) {
          shouldAutoRestartRef.current = true;
          setIsListening(true);
        } else {
          let errorMsg = errorObj.message || 'Failed to start speech recognition';

          // Provide browser-specific error messages
          if (errorObj.name === 'NotAllowedError' || errorObj.name === 'NotSupportedError') {
            errorMsg = getBrowserSpecificError(browser, 'speech-recognition', errorObj.name.toLowerCase().replace('error', ''));
          }

          console.error('Error starting speech recognition:', err);
          shouldAutoRestartRef.current = false;
          setIsListening(false);
          setError(errorMsg);
          onError?.(errorMsg);
        }
      }
    }
  }, [isListening, isSupported, browser, onError]);

  return {
    isListening,
    startListening,
    stopListening,
    transcript,
    error,
    isSupported: !!isSupported,
  };
}


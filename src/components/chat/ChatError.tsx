'use client';

import { RefreshCw, OctagonX } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ErrorType = 'unauthorized' | 'network' | 'general';

interface ChatErrorProps {
  errorMessage: string;
  errorType?: ErrorType;
  onRetry?: () => void;
  className?: string;
}

export function ChatError({
  errorMessage,
  errorType,
  onRetry,
  className,
}: ChatErrorProps) {
  // Determine error type from message if not explicitly provided
  const detectedType: ErrorType = errorType || 
    (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('not authenticated') || errorMessage.toLowerCase().includes('401')
      ? 'unauthorized'
      : errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('connection') || errorMessage.toLowerCase().includes('interrupted')
      ? 'network'
      : 'general');

  // Get default message based on error type
  const getDefaultMessage = () => {
    if (detectedType === 'unauthorized') {
      return 'API error: 401 Unauthorized';
    }
    if (detectedType === 'network') {
      return 'The connection was interrupted while generating your response.';
    }
    return 'An error occurred while processing your request.';
  };

  const displayMessage = errorMessage || getDefaultMessage();

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg py-3 px-4 w-full',
        className
      )}
      style={{
        backgroundColor: '#FEECEB', // Very light pink/peach background
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Error Icon - OctagonX */}
      <OctagonX
        className="flex-shrink-0"
        style={{
          width: '20px',
          height: '20px',
          color: '#DC2626', // Vibrant red
        }}
        strokeWidth="2"
        fill="none"
      />

      {/* Error Message */}
      <p
        className="flex-1 text-sm font-normal"
        style={{
          color: '#B91C1C', // Reddish-brown text
        }}
      >
        {displayMessage}
      </p>

      {/* Retry Button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 rounded"
          style={{
            color: '#B91C1C', // Reddish-brown text
            background: 'transparent',
            cursor: 'pointer',
          }}
          aria-label="Retry request"
        >
          <RefreshCw
            className="h-4 w-4"
            style={{ color: '#B91C1C' }}
            strokeWidth="2"
          />
          <span
            className="text-sm font-normal"
            style={{ color: '#B91C1C' }}
          >
            Retry
          </span>
        </button>
      )}
    </div>
  );
}

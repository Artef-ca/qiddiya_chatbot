/**
 * Chat input submit button and mic button component
 * Extracted from ChatInput for better organization
 */

import { Mic, MicOff, ArrowBigUpDash } from 'lucide-react';
import MicPulseRipple from '@/components/ui/MicPulseRipple';
import { COLORS, BUTTON_STYLES, SPACING, BORDER_RADIUS } from '@/lib/styles/commonStyles';

interface ChatInputSubmitProps {
  message: string;
  attachmentsCount: number;
  pinnedItemsCount: number;
  isListening: boolean;
  isHoveringMic: boolean;
  onMicClick: () => void;
  onMicHover: (hovering: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatInputSubmit({
  message,
  attachmentsCount,
  pinnedItemsCount,
  isListening,
  isHoveringMic,
  onMicClick,
  onMicHover,
  onSubmit,
  isLoading = false,
  disabled = false,
}: ChatInputSubmitProps) {
  const hasContent = message.trim() || attachmentsCount > 0 || pinnedItemsCount > 0;
  const isSubmitDisabled = !hasContent || isLoading || disabled;

  return (
    <div 
      className="flex items-center gap-2"
      style={{
        overflow: isListening && !isHoveringMic ? 'visible' : 'visible',
        position: 'relative',
        zIndex: isListening && !isHoveringMic ? 10 : 1,
      }}
    >
      <button
        type="button"
        onClick={onMicClick}
        onMouseEnter={() => onMicHover(true)}
        onMouseLeave={() => onMicHover(false)}
        className="focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 focus-visible:rounded transition-colors relative"
        style={{
          ...BUTTON_STYLES.actionButton,
          color: isListening ? '#0093D4' : COLORS.electricViolet[700],
          backgroundColor: 'transparent',
          border: 'none',
          cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
          opacity: isLoading || disabled ? 0.5 : 1,
          overflow: 'visible',
        }}
        disabled={isLoading || disabled}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        {(isListening && isHoveringMic) ? (
          <MicOff 
            style={{ 
              width: '24px', 
              height: '24px',
              color: '#0093D4'
            }} 
            aria-hidden="true" 
          />
        ) : isListening ? (
          <MicPulseRipple 
            size={24}
            color="#0093D4"
            className="relative z-0"
          />
        ) : (
          <Mic 
            style={{ 
              width: '24px', 
              height: '24px',
              color: COLORS.electricViolet[700]
            }} 
            aria-hidden="true" 
          />
        )}
      </button>
      <button
        type="submit"
        disabled={isSubmitDisabled}
        aria-label="Send message"
        className="focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 focus-visible:rounded transition-all"
        onClick={onSubmit}
        style={{
          ...BUTTON_STYLES.actionButton,
          border: hasContent
            ? `1px solid ${COLORS.electricViolet[600]}`
            : '1px solid var(--Jumbo-200, #CFCFD2)',
          background: hasContent
            ? COLORS.electricViolet[600]
            : 'var(--Jumbo-100, #E6E6E7)',
          boxShadow: hasContent
            ? '0 1px 2px 0 var(--Electric-Violet-200, #DCD4FF)'
            : 'none',
          cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        <ArrowBigUpDash 
          style={{ 
            width: '24px', 
            height: '24px',
            color: hasContent
              ? COLORS.electricViolet[50]
              : 'var(--Jumbo-400, #84848C)'
          }} 
          aria-hidden="true" 
        />
      </button>
    </div>
  );
}


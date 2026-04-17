'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import FileAttachmentCard from '@/components/chat/FileAttachmentCard';
import PinnedItemCard from '@/components/chat/PinnedItemCard';
import { ChatInputActions } from './ChatInputActions';
import { ChatInputSubmit } from './ChatInputSubmit';
import { useAppSelector } from '@/store/hooks';
import { useSpeechRecognition, useTextareaAutoResize } from '@/hooks';
import { generateId } from '@/lib/utils/id';
import { SHADOW_STYLES, COLORS, BORDER_RADIUS, SPACING } from '@/lib/styles/commonStyles';
import type { FileAttachment, PinnedItem } from '@/types';
import '@/app/globals.css';

interface ChatInputProps {
  onSendMessage: (message: string, attachments?: FileAttachment[], pinnedItems?: PinnedItem[], isPro?: boolean) => void;
  isLoading?: boolean;
  disabled?: boolean;
  noPadding?: boolean; // When true, removes the padding wrapper for centered display (e.g., in welcome screen)
  onAddToInputRef?: (callback: (text: string) => void) => void; // Callback to expose addToInput function
  onIsProChange?: (isPro: boolean) => void; // Callback to sync Pro mode state (e.g. for retry/continue)
  isPro?: boolean; // Controlled: when provided with onIsProChange, parent owns Pro state (persists across welcome -> chat)
}

export default function ChatInput({
  onSendMessage,
  isLoading = false,
  disabled = false,
  noPadding = false,
  onAddToInputRef,
  onIsProChange,
  isPro: isProProp,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [selectedPinnedItems, setSelectedPinnedItems] = useState<PinnedItem[]>([]);
  const [isHoveringMic, setIsHoveringMic] = useState(false);
  const [isProLocal, setIsProLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controlled vs uncontrolled: when isPro and onIsProChange provided, use parent state (persists across welcome -> chat)
  const isControlled = isProProp !== undefined && onIsProChange !== undefined;
  const isPro = isControlled ? isProProp : isProLocal;
  const setIsPro = isControlled
    ? (value: boolean | ((prev: boolean) => boolean)) => onIsProChange(typeof value === 'function' ? value(isPro) : value)
    : setIsProLocal;
  
  // Expose addToInput function via ref callback
  useEffect(() => {
    if (onAddToInputRef) {
      onAddToInputRef((text: string) => {
        setMessage(prev => prev ? `${prev}\n\n${text}` : text);
        // Focus and scroll to bottom of textarea
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      });
    }
  }, [onAddToInputRef]);

  // Use speech recognition hook
  const { isListening, startListening, stopListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setMessage(transcript);
    },
  });

  // Use textarea auto-resize hook
  const { textareaRef } = useTextareaAutoResize({
    value: message,
    onScrollbarChange: setShowScrollbar,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || attachments.length > 0 || selectedPinnedItems.length > 0) && !isLoading && !disabled) {
      // Stop voice recording if it's currently active
      if (isListening) {
        stopListening();
      }
      onSendMessage(message.trim(), attachments, selectedPinnedItems, isPro);
      setMessage('');
      setAttachments([]);
      setSelectedPinnedItems([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments: FileAttachment[] = Array.from(files).map((file) => ({
        id: generateId('file'),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        file: file,
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleRemovePinnedItem = (id: string) => {
    setSelectedPinnedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSelectPinnedItem = (item: PinnedItem) => {
    setSelectedPinnedItems((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) {
        return prev.filter((p) => p.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      // Clear message on Escape
      setMessage('');
      setAttachments([]);
      setSelectedPinnedItems([]);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      // Stop recording but keep the transcribed text so user can edit it
      stopListening();
    } else {
      // Start/resume recording - pass current message to append new speech to existing text
      startListening(message);
    }
  };

  return (
    <div 
      className="bg-gray-50 z-10 relative w-full min-w-0" 
      style={{ 
        display: 'flex',
        width: '100%',
        padding: noPadding ? '0' : '0',
        flexDirection: 'column',
        alignItems: noPadding ? 'center' : 'center',
        gap: '16px',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-12 bg-linear-to-b from-gray-50 via-gray-50/70 to-transparent backdrop-blur-md pointer-events-none z-0"></div>
      <form 
        onSubmit={handleSubmit} 
        className={cn(
          // Match ChatHeader: width 100% + max-width 800px only — never force 800px at lg+,
          // or the form overflows the padded column when the viewport is narrow and slides under the sidebar.
          "relative z-10 flex min-w-0 w-full max-w-[800px] items-end"
        )}
        style={{
          gap: SPACING.xs,
          borderRadius: BORDER_RADIUS.md,
          boxShadow: SHADOW_STYLES.chatInput,
        }}
      >
        <div 
          className="relative flex-1 flex flex-col justify-between items-start min-h-[112px]"
          style={{
            borderRadius: BORDER_RADIUS.md,
            border: `1px solid ${COLORS.lynch[200]}`,
            background: '#FFF',
            padding: '16px 24px 12px 12px',
            gap: '16px',
          }}
        >
          {/* Placeholder Styles */}
          <style dangerouslySetInnerHTML={{__html: `
            .chat-input-textarea::placeholder {
              color: ${COLORS.jumbo[400]};
              font-family: Manrope;
              font-size: 14px;
              font-style: normal;
              font-weight: 500;
              line-height: 22px;
              letter-spacing: -0.059px;
            }
            @media (min-width: 1024px) {
              .chat-input-textarea::placeholder {
                font-size: 16px;
              }
            }
          `}} />
          
          {/* Middle Section: Textarea - Flexible */}
          <div className="w-full flex-1 flex flex-col" style={{ minHeight: '24px' }}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={isLoading || disabled ? "Reply..." : "How can I assist you today?"}
              disabled={isLoading || disabled}
              aria-label="Message input"
              aria-describedby="message-input-help"
              className={cn(
                'chat-input-textarea w-full bg-transparent border-0',
                'focus-visible:outline-none',
                'resize-none transition-all duration-200',
                showScrollbar ? 'overflow-y-auto' : 'overflow-y-hidden',
                'min-h-[24px] max-h-[200px]',
                'text-sm lg:text-base'
              )}
              style={{
                alignSelf: 'stretch',
                paddingLeft: '12px',
                color: COLORS.lynch[900],
                fontFamily: 'Manrope',
                fontStyle: 'normal',
                fontWeight: 500,
                lineHeight: '22px',
                letterSpacing: '-0.059px',
                resize: 'none',
              }}
              rows={1}
            />
            <span id="message-input-help" className="sr-only">
              Type your message and press Enter to send, or Shift+Enter for a new line
            </span>
          </div>

          {/* Wrapper: Attachments (8px gap) + Action buttons */}
          <div className="w-full flex flex-col" style={{ gap: '8px' }}>
            {/* Attachments and Pinned Items - Below input text, above action buttons */}
            {(attachments.length > 0 || selectedPinnedItems.length > 0) && (
              <div className="w-full flex flex-wrap gap-2" style={{ paddingLeft: '10px' }}>
                {attachments.map((attachment) => (
                  <FileAttachmentCard
                    key={attachment.id}
                    attachment={attachment}
                    onRemove={handleRemoveAttachment}
                  />
                ))}
                {selectedPinnedItems.map((item) => (
                  <PinnedItemCard
                    key={item.id}
                    item={item}
                    onRemove={handleRemovePinnedItem}
                    isSelected={true}
                  />
                ))}
              </div>
            )}

            {/* Action Buttons Container - Full Width */}
            <div className="w-full flex items-center justify-between bg-transparent">
            <div className="flex items-center gap-4">
            <ChatInputActions
              onFileSelect={handleFileSelect}
              onSelectPinnedItem={handleSelectPinnedItem}
              selectedPinnedItems={selectedPinnedItems}
              fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
              isLoading={isLoading}
              disabled={disabled}
            />
            {/* Pro mode toggle */}
            <button
              type="button"
              onClick={() => {
                if (!isLoading && !disabled) setIsPro((prev) => !prev);
              }}
              className="flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 rounded"
              style={{
                cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
                opacity: isLoading || disabled ? 0.5 : 1,
                padding: '4px 8px',
                border: 'none',
                background: 'transparent',
                fontFamily: 'Manrope',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.lynch[700],
              }}
              disabled={isLoading || disabled}
              aria-label={isPro ? 'Pro mode on' : 'Pro mode off'}
              aria-pressed={isPro}
            >
              <span
                role="switch"
                aria-checked={isPro}
                className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-out"
                style={{
                  background: isPro ? `linear-gradient(135deg, ${COLORS.electricViolet[600]}, ${COLORS.electricViolet[700]})` : COLORS.lynch[300],
                  boxShadow: isPro ? '0 1px 3px rgba(113, 34, 244, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'inset 0 1px 2px rgba(0,0,0,0.06)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLoading && !disabled) setIsPro((prev) => !prev);
                }}
              >
                <span
                  className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 ease-out"
                  style={{
                    transform: isPro ? 'translateX(18px)' : 'translateX(2px)',
                    marginTop: '2px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
                  }}
                />
              </span>
              <span>Pro</span>
            </button>
            </div>
            <ChatInputSubmit
              message={message}
              attachmentsCount={attachments.length}
              pinnedItemsCount={selectedPinnedItems.length}
              isListening={isListening}
              isHoveringMic={isHoveringMic}
              onMicClick={handleMicClick}
              onMicHover={setIsHoveringMic}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              disabled={disabled}
            />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Copy, File, Check } from 'lucide-react';
import { useAppDispatch, useAppStore, useAppSelector } from '@/store/hooks';
import { addToast, removeToast } from '@/store/slices/uiSlice';
import Image from 'next/image';
import { themeColors, themeSpacing, themeRadius } from '@/lib/utils/theme';

export type CopyFormat = 'Image' | 'Text' | 'Excel' | 'CSV' | 'MD';

interface PinnedItem {
  id: string;
  content: string;
  title?: string;
  type: 'message' | 'response';
}

interface CopyAsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle?: string;
  shareMessageId?: string | null; // Message ID to copy (only this message and its response)
  conversationMessages?: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string }>; // Optional: pass messages directly
  tableChartContent?: { type: 'table' | 'chart'; content: string; title?: string } | null; // Table or chart content to copy
  pinnedItems?: PinnedItem[]; // Pinned items to copy
  isPinBoardExport?: boolean; // Whether this is a pinboard export
}

export default function CopyAsModal({
  isOpen,
  onClose,
  chatId,
  chatTitle = 'chat',
  shareMessageId = null,
  conversationMessages,
  tableChartContent = null,
  pinnedItems = [],
  isPinBoardExport = false,
}: CopyAsModalProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { conversations } = useAppSelector((state) => state.chat);
  const [selectedFormat, setSelectedFormat] = useState<CopyFormat | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // Get the conversation messages - prefer passed messages, otherwise lookup from Redux
  const conversationMessagesData = useMemo(() => {
    if (conversationMessages) {
      return conversationMessages; // Use passed messages directly
    }
    // Otherwise, lookup from Redux
    if (!chatId) return null;
    const conversation = conversations.find((conv) => conv.id === chatId);
    return conversation?.messages || null;
  }, [conversationMessages, conversations, chatId]);

  // Filter messages to only include the specific message and its response when shareMessageId is provided
  // Skip this if tableChartContent is provided (we'll copy only the table/chart)
  const messagesToCopy = useMemo(() => {
    // If tableChartContent is provided, don't filter messages (we'll copy only the table/chart)
    if (tableChartContent) {
      return null;
    }
    
    if (!shareMessageId) {
      return null; // Copy full conversation if no specific message ID
    }

    if (!conversationMessagesData || conversationMessagesData.length === 0) {
      return null; // Copy full conversation if messages not found
    }

    const messages = conversationMessagesData;
    const messageIndex = messages.findIndex((msg) => msg.id === shareMessageId);

    if (messageIndex === -1) {
      return null; // Message not found, copy full conversation
    }

    const clickedMessage = messages[messageIndex];
    const messagesToInclude: string[] = [];

    if (clickedMessage.role === 'assistant') {
      // If clicked on bot response, find the preceding user message
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          messagesToInclude.push(messages[i].id);
          messagesToInclude.push(clickedMessage.id);
          break;
        }
      }
    } else if (clickedMessage.role === 'user') {
      // If clicked on user message, find the following bot response
      messagesToInclude.push(clickedMessage.id);
      for (let i = messageIndex + 1; i < messages.length; i++) {
        if (messages[i].role === 'assistant') {
          messagesToInclude.push(messages[i].id);
          break;
        }
      }
    }

    return messagesToInclude.length > 0 ? messagesToInclude : null;
  }, [shareMessageId, conversationMessagesData, chatId, tableChartContent]);

  const spreadsheetCopyAllowed = tableChartContent?.type === 'table';
  const tableOnlyFormatTooltip = 'Available only for table exports.';

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFormat(null);
      setIsCopying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || spreadsheetCopyAllowed) return;
    if (selectedFormat === 'Excel' || selectedFormat === 'CSV') {
      setSelectedFormat(null);
    }
  }, [isOpen, spreadsheetCopyAllowed, selectedFormat]);

  const handleCopy = async () => {
    if (!selectedFormat) return;

    setIsCopying(true);

    // Get format name for notifications (Image -> PNG)
    const formatName = selectedFormat === 'Image' ? 'PNG' : selectedFormat;

    // Show generating notification
    const generatingMessage = `Generating ${formatName}...`;
    dispatch(
      addToast({
        message: generatingMessage,
        type: 'info',
        duration: 0, // Persistent - won't auto-dismiss
      })
    );
    // Get the toast ID from the store after it's added
    const storeState = store.getState();
    const generatingToast = storeState.ui.toasts.find(t => t.message === generatingMessage && t.type === 'info');
    const generatingToastId = generatingToast?.id;

    try {
      let blob: Blob;
      
      // If copying pinned items, use pinboard export API
      if (isPinBoardExport && pinnedItems.length > 0) {
        const exportTitle = chatTitle || 'Pinned Item';
        
        const response = await fetch('/api/export-pinboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: selectedFormat.toLowerCase() === 'text' ? 'text' : selectedFormat.toLowerCase(),
            title: exportTitle,
            items: pinnedItems.map(item => ({
              id: item.id,
              content: item.content,
              title: item.title,
              type: item.type,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate file');
        }
        blob = await response.blob();
      } else if (tableChartContent) {
        // If table/chart content is provided, use POST to avoid URL length limits with large content
        const exportTitle = tableChartContent.title || (tableChartContent.type === 'table' ? 'Table' : 'Chart');
        const postUrl = `/api/export-chat?format=${selectedFormat.toLowerCase()}&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}`;

        const response = await fetch(postUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tableChartContent,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to generate file');
        }
        blob = await response.blob();
      } else {
        // Regular conversation copy
        // Get conversation from Redux store to pass to server
        const conversation = conversations.find((conv) => conv.id === chatId);
        
        // Prepare conversation data for export
        // Use conversationMessagesData if available, otherwise fallback to conversation.messages
        const messagesToUse = conversationMessagesData || conversation?.messages || [];
        
        let conversationData: {
          id: string;
          title: string;
          messages: Array<{
            id: string;
            role: 'user' | 'assistant' | 'system';
            content: string;
            timestamp: string;
          }>;
        } | null = null;
        if (conversation && messagesToUse.length > 0) {
          conversationData = {
            id: conversation.id,
            title: conversation.title,
            messages: messagesToUse.map((msg) => {
              // Handle timestamp - it might be Date, string, or missing
              let timestamp: string;
              if ('timestamp' in msg && msg.timestamp) {
                if (msg.timestamp instanceof Date) {
                  timestamp = msg.timestamp.toISOString();
                } else if (typeof msg.timestamp === 'string') {
                  timestamp = msg.timestamp;
                } else {
                  timestamp = new Date().toISOString();
                }
              } else {
                timestamp = new Date().toISOString();
              }
              
              return {
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp,
                is_pro: (msg as { is_pro?: boolean }).is_pro,
              };
            }),
          };
        }

        // Include messageIds in URL if we're copying specific messages only
        const messageIdsParam = messagesToCopy && messagesToCopy.length > 0
          ? `&messageIds=${encodeURIComponent(JSON.stringify(messagesToCopy))}`
          : '';

        // Use POST with conversation data if available, otherwise fallback to GET
        if (conversationData) {
          // POST request with conversation data (for newly created conversations)
          // Format and other params go in URL query string, conversationData goes in body
          const postUrl = `/api/export-chat?format=${selectedFormat.toLowerCase()}&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;

          console.log('[CopyAsModal] Copying with conversation data via POST:', { chatId, format: selectedFormat, messageCount: conversationData.messages.length });
          
          const response = await fetch(postUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationData: conversationData,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate file');
          }
          blob = await response.blob();
        } else {
          // Fallback to GET request (for existing conversations in mock data)
          let downloadUrl: string;
          switch (selectedFormat) {
            case 'Text':
              downloadUrl = `/api/export-chat?format=text&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              break;
            case 'Image':
              downloadUrl = `/api/export-chat?format=image&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              break;
            case 'Excel':
              downloadUrl = `/api/export-chat?format=excel&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              break;
            case 'CSV':
              downloadUrl = `/api/export-chat?format=csv&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              break;
            case 'MD':
              downloadUrl = `/api/export-chat?format=md&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              break;
            default:
              throw new Error('Unsupported format');
          }

          // Fetch the file
          const response = await fetch(downloadUrl);
          if (!response.ok) {
            throw new Error('Failed to generate file');
          }
          blob = await response.blob();
        }
      }

      // Copy to clipboard
      if (selectedFormat === 'Image') {
        // For images, copy the blob directly
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
      } else {
        // For text-based formats (Text, Excel, CSV, MD), convert to text and copy
        const text = await blob.text();
        await navigator.clipboard.writeText(text);
      }

      // Remove generating toast
      if (generatingToastId) {
        dispatch(removeToast(generatingToastId));
      }

      // Show success notification
      dispatch(
        addToast({
          message: `${formatName} copied to clipboard`,
          type: 'success',
          duration: 5000,
        })
      );

      // Close modal
      onClose();
    } catch (error) {
      // Remove generating toast on error
      if (generatingToastId) {
        dispatch(removeToast(generatingToastId));
      }

      // Show error notification
      dispatch(
        addToast({
          message: error instanceof Error ? error.message : 'Failed to copy',
          type: 'error',
          duration: 5000,
        })
      );

      setIsCopying(false);
    }
  };

  const handleCancel = () => {
    if (!isCopying) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isDisabled = isCopying;

  const modalContent = (
    <>
      {/* Blurred Background Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
        }}
        onClick={handleCancel}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          pointerEvents: 'none',
        }}
        onClick={handleCancel}
      >
        <div
          style={{
            background: themeColors.gray50(),
            border: `1px solid ${themeColors.gray100()}`,
            borderRadius: '24px',
            padding: themeSpacing.xl(),
            boxShadow: `0px 8px 16px 0px ${themeColors.gray100()}`,
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <h3
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '20px',
              fontWeight: 600,
              lineHeight: '32px',
              letterSpacing: '-0.12px',
              color: themeColors.textPrimary(),
              margin: 0,
              paddingBottom: '10px',
            }}
          >
            Copy as
          </h3>

          {/* Format Options */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              paddingTop: '8px',
              paddingBottom: '32px',
            }}
          >
            {(['Image', 'Text', 'Excel', 'CSV', 'MD'] as CopyFormat[]).map((format) => {
              const isSelected = selectedFormat === format;
              const spreadsheetBlocked =
                (format === 'Excel' || format === 'CSV') && !spreadsheetCopyAllowed;
              const isDisabledFormat = isCopying || spreadsheetBlocked;

              // File type colors
              const getFileTypeColor = (format: CopyFormat) => {
                switch (format) {
                  case 'Image':
                    return themeColors.primary700();
                  case 'Text':
                    return themeColors.error();
                  case 'Excel':
                  case 'CSV':
                    return themeColors.success();
                  case 'MD':
                    return themeColors.secondary500();
                  default:
                    return themeColors.gray600();
                }
              };

              return (
                <button
                  key={format}
                  onClick={() => !isDisabledFormat && setSelectedFormat(format)}
                  disabled={isDisabledFormat}
                  title={spreadsheetBlocked ? tableOnlyFormatTooltip : undefined}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    border: isSelected
                      ? `1px solid ${themeColors.primary300()}`
                      : isDisabledFormat
                      ? `1px solid ${themeColors.neutral100()}`
                      : `1px solid ${themeColors.primary200()}`,
                    background: isSelected
                      ? `linear-gradient(0deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.50) 100%), ${themeColors.primary50()}`
                      : isDisabledFormat
                      ? themeColors.neutral50()
                      : 'transparent',
                    boxShadow: isSelected
                      ? '0px 1px 2px 0px rgba(220, 212, 255, 1)' // shadow-main-200-xs (Electric Violet-200)
                      : !isDisabledFormat
                      ? '0px 1px 2px 0px rgba(236, 232, 255, 1)' // shadow-main-100-xs
                      : 'none',
                    cursor: isDisabledFormat ? 'not-allowed' : 'pointer',
                    opacity: isDisabledFormat ? 0.5 : 1,
                    width: '74px',
                    height: '76px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabledFormat && !isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabledFormat && !isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Icon */}
                  <div style={{ position: 'relative', width: '24px', height: '27px' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '27px',
                        position: 'relative',
                        marginLeft: '1px',
                        marginTop: '2px',
                      }}
                    >
                      {/* File icon */}
                      <File
                        size={20}
                        style={{
                          position: 'absolute',
                          top: 'calc(50% - 3.5px)',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          opacity: 0.8,
                          color: isDisabledFormat ? themeColors.neutral400() : themeColors.gray400(),
                        }}
                      />
                      {/* File type label */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          width: '22px',
                          height: '8px',
                          background: isDisabledFormat ? themeColors.neutral500() : getFileTypeColor(format),
                          borderRadius: '1px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'Manrope, var(--font-manrope)',
                            fontSize: '8px',
                            fontWeight: 800,
                            lineHeight: '16px',
                            letterSpacing: '0.32px',
                            color: themeColors.textInverse(),
                            textAlign: 'center',
                          }}
                        >
                          {format === 'Image'
                            ? 'PNG'
                            : format === 'Excel'
                            ? 'XLS'
                            : format === 'Text'
                            ? 'TXT'
                            : format}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Label */}
                  <span
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '13px',
                      fontWeight: 700,
                      lineHeight: '24px',
                      letterSpacing: '0.0897px',
                      color: isDisabledFormat ? themeColors.neutral500() : themeColors.gray600(),
                      textAlign: 'center',
                    }}
                  >
                    {format}
                  </span>

                  {/* Checkmark badge for selected state */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: `linear-gradient(0deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.50) 100%), ${themeColors.primary50()}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${themeColors.primary300()}`,
                        boxShadow: '0px 1px 2px 0px rgba(220, 212, 255, 1)', // Same shadow as card
                      }}
                    >
                        <Check
                        size={12}
                        color={themeColors.success()}
                        strokeWidth={2.5}
                        style={{
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                        }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', width: '100%' }}>
            <button
              onClick={handleCancel}
              disabled={isCopying}
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0.0897px',
                color: isCopying ? themeColors.neutral400() : themeColors.gray700(),
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                cursor: isCopying ? 'not-allowed' : 'pointer',
                opacity: isCopying ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              disabled={!selectedFormat || isCopying}
              style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: 700,
                lineHeight: '24px',
                letterSpacing: '0.0897px',
                color: !selectedFormat || isCopying ? themeColors.neutral400() : themeColors.primary50(),
                background: !selectedFormat || isCopying ? themeColors.neutral100() : themeColors.primary600(),
                border: `1px solid ${!selectedFormat || isCopying ? themeColors.neutral200() : themeColors.primary600()}`,
                padding: '6px 14px',
                borderRadius: '6px',
                boxShadow: !selectedFormat || isCopying ? 'none' : '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                cursor: !selectedFormat || isCopying ? 'not-allowed' : 'pointer',
                opacity: 1,
              }}
            >
              <Copy size={16} style={{ color: !selectedFormat || isCopying ? themeColors.neutral400() : themeColors.primary50() }} />
              Copy
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}


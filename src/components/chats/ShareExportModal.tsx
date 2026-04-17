'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Link as LinkIcon, Send, Check, File } from 'lucide-react';
import { useClipboard } from '@/hooks/useClipboard';
import { useAppDispatch, useAppStore, useAppSelector } from '@/store/hooks';
import { addToast, removeToast } from '@/store/slices/uiSlice';
import Image from 'next/image';
import { themeColors, themeSpacing, themeRadius } from '@/lib/utils/theme';

export type ExportFormat = 'Image' | 'PDF' | 'Excel' | 'CSV' | 'MD';

interface PinnedItem {
  id: string;
  content: string;
  title?: string;
  type: 'message' | 'response';
  pinnedAt: Date;
}

interface ShareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle?: string;
  pinnedItems?: PinnedItem[];
  isPinBoardExport?: boolean;
  showChatLinkOption?: boolean; // Control whether to show "Include chat link" option
  shareMessageId?: string | null; // Message ID to share (only this message and its response)
  conversationMessages?: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string }>; // Optional: pass messages directly to avoid lookup
  tableChartContent?: { type: 'table' | 'chart'; content: string; title?: string } | null; // Table or chart content to share/export
  exportOnly?: boolean; // Open directly on Export and hide Share tab
}

export default function ShareExportModal({
  isOpen,
  onClose,
  chatId,
  chatTitle = 'chat',
  pinnedItems = [],
  isPinBoardExport = false,
  showChatLinkOption = true, // Default to true for backward compatibility
  shareMessageId = null, // Message ID to share (only this message and its response)
  conversationMessages, // Optional: pass messages directly
  tableChartContent = null, // Table or chart content to share/export
  exportOnly = false,
}: ShareExportModalProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { copy } = useClipboard();
  const { conversations } = useAppSelector((state) => state.chat);
  const [activeTab, setActiveTab] = useState<'Share' | 'Export'>(exportOnly ? 'Export' : 'Share');
  
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
  // Skip this if tableChartContent is provided (we'll export only the table/chart)
  const messagesToShare = useMemo(() => {
    // If tableChartContent is provided, don't filter messages (we'll export only the table/chart)
    if (tableChartContent) {
      return null;
    }
    
    if (!shareMessageId) {
      return null; // Share full conversation if no specific message ID
    }
    
    if (!conversationMessagesData || conversationMessagesData.length === 0) {
      console.warn('[ShareExportModal] Conversation messages not found', { chatId, shareMessageId });
      return null; // Share full conversation if messages not found
    }
    
    const messages = conversationMessagesData;
    const messageIndex = messages.findIndex((msg) => msg.id === shareMessageId);
    
    if (messageIndex === -1) {
      console.warn('[ShareExportModal] Message not found in conversation', { shareMessageId, messageCount: messages.length });
      return null; // Message not found, share full conversation
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
    
    console.log('[ShareExportModal] Messages to share:', { 
      shareMessageId, 
      messagesToInclude, 
      clickedRole: clickedMessage.role,
      messageIndex,
      totalMessages: messages.length 
    });
    
    if (messagesToInclude.length === 0) {
      console.warn('[ShareExportModal] No messages found to include', { shareMessageId, clickedRole: clickedMessage.role });
    }
    
    return messagesToInclude.length > 0 ? messagesToInclude : null;
  }, [shareMessageId, conversationMessagesData, chatId, tableChartContent]);

  /** Excel/CSV only when exporting an explicit table (not chart or sidebar pinboard). */
  const spreadsheetExportAllowed = tableChartContent?.type === 'table';
  const tableOnlyFormatTooltip = 'Available only for table exports.';

  // Share tab state
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [includeChatLink, setIncludeChatLink] = useState(true);
  const [includeAttachment, setIncludeAttachment] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>('PDF');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Export tab state - track which format is being exported
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  // Get chat URL (only for conversations, not pinned items)
  const chatUrl = typeof window !== 'undefined' && !isPinBoardExport && chatId
    ? `${window.location.origin}/chat/${chatId}`
    : '';

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab(exportOnly ? 'Export' : 'Share');
      setEmails('');
      setMessage('');
      setIncludeChatLink(true);
      setIncludeAttachment(true);
      setSelectedFormat('PDF');
      setIsSending(false);
      setSendError(null);
      setExportingFormat(null);
    }
  }, [isOpen, exportOnly]);

  useEffect(() => {
    if (!isOpen || spreadsheetExportAllowed) return;
    if (selectedFormat === 'Excel' || selectedFormat === 'CSV') {
      setSelectedFormat('PDF');
    }
  }, [isOpen, spreadsheetExportAllowed, selectedFormat]);

  const handleCopyLink = async () => {
    if (chatUrl) {
      await copy(chatUrl);
      dispatch(
        addToast({
          message: 'Link copied to clipboard',
          type: 'success',
        })
      );
    }
  };

  const handleSend = async () => {
    // Validate emails
    const emailList = emails
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emailList.length === 0) {
      setSendError('Please enter at least one email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      setSendError(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    setIsSending(true);
    setSendError(null);
    
    const generatingMessage = includeAttachment && selectedFormat 
      ? `Generating ${selectedFormat}...` 
      : null;
    
    // Show persistent loading toast if generating attachment
    if (generatingMessage) {
      dispatch(
        addToast({
          message: generatingMessage,
          type: 'info',
          duration: 0, // Persistent - won't auto-dismiss
        })
      );
    }

    try {
      const response = await fetch('/api/share-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: isPinBoardExport ? '' : chatId,
          emails: emailList,
          message: message.trim() || undefined,
          includeChatLink: isPinBoardExport ? false : includeChatLink,
          format: includeAttachment ? selectedFormat : undefined,
          title: chatTitle,
          pinnedItems: isPinBoardExport ? pinnedItems.map(item => ({
            id: item.id,
            content: item.content,
            title: item.title,
            type: item.type,
          })) : undefined,
          isPinBoardExport,
          messageIds: messagesToShare || undefined, // Only share specific messages if provided
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send message' }));
        throw new Error(error.message || 'Failed to send message');
      }

      // Remove generating toast if it exists
      // Get current state directly from store to find the toast immediately
      if (generatingMessage) {
        const currentToasts = store.getState().ui.toasts;
        const generatingToast = currentToasts.find(
          (t) => t.type === 'info' && t.message === generatingMessage
        );
        if (generatingToast) {
          dispatch(removeToast(generatingToast.id));
        }
      }
      
      // Show success toast
      dispatch(
        addToast({
          message: 'Message was successfully sent',
          type: 'success',
        })
      );

      // Close modal
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setSendError(errorMessage);
      setIsSending(false);
      
      // Remove generating toast on error
      // Get current state directly from store to find the toast immediately
      if (generatingMessage) {
        const currentToasts = store.getState().ui.toasts;
        const generatingToast = currentToasts.find(
          (t) => t.type === 'info' && t.message === generatingMessage
        );
        if (generatingToast) {
          dispatch(removeToast(generatingToast.id));
        }
      }
      
      // Show error toast
      dispatch(
        addToast({
          message: errorMessage,
          type: 'error',
        })
      );
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format);

    try {
      let downloadUrl: string;
      let filename: string;
      let response: Response;

      // If exporting pinned items, use POST with pinned items data
      if (isPinBoardExport && pinnedItems.length > 0) {
        const title = chatTitle || 'Pin Board';
        
        // Determine filename based on format
        switch (format) {
          case 'PDF':
            filename = `${title}.pdf`;
            break;
          case 'Image':
            filename = `${title}.png`;
            break;
          case 'Excel':
            filename = `${title}.xlsx`;
            break;
          case 'CSV':
            filename = `${title}.csv`;
            break;
          case 'MD':
            filename = `${title}.md`;
            break;
          default:
            filename = `${title}.pdf`;
        }

        response = await fetch('/api/export-pinboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: format.toLowerCase(),
            title,
            items: pinnedItems.map(item => ({
              id: item.id,
              content: item.content,
              title: item.title,
              type: item.type,
            })),
          }),
        });
      } else if (tableChartContent) {
        // Export table/chart content only
        const exportTitle = tableChartContent.title || (tableChartContent.type === 'table' ? 'Table' : 'Chart');
        const tableChartParam = `&tableChartContent=${encodeURIComponent(JSON.stringify(tableChartContent))}`;
        
        switch (format) {
          case 'PDF':
            downloadUrl = `/api/export-chat?format=pdf&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
            filename = `${exportTitle}.pdf`;
            break;

          case 'Image':
            downloadUrl = `/api/export-chat?format=image&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
            filename = `${exportTitle}.png`;
            break;

          case 'Excel':
            downloadUrl = `/api/export-chat?format=excel&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
            filename = `${exportTitle}.xlsx`;
            break;

          case 'CSV':
            downloadUrl = `/api/export-chat?format=csv&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
            filename = `${exportTitle}.csv`;
            break;

          case 'MD':
            downloadUrl = `/api/export-chat?format=md&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
            filename = `${exportTitle}.md`;
            break;

          default:
            throw new Error('Unsupported export format');
        }

        response = await fetch(downloadUrl);
      } else {
        // Regular conversation export
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

        // Include messageIds in URL if we're exporting specific messages only
        const messageIdsParam = messagesToShare && messagesToShare.length > 0
          ? `&messageIds=${encodeURIComponent(JSON.stringify(messagesToShare))}`
          : '';
        
        // Use POST with conversation data if available, otherwise fallback to GET
        if (conversationData) {
          // POST request with conversation data (for newly created conversations)
          // Format and other params go in URL query string, conversationData goes in body
          const messageIdsParam = messagesToShare && messagesToShare.length > 0
            ? `&messageIds=${encodeURIComponent(JSON.stringify(messagesToShare))}`
            : '';
          
          const postUrl = `/api/export-chat?format=${format.toLowerCase()}&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;

          switch (format) {
            case 'PDF':
              filename = `${chatTitle}.pdf`;
              break;
            case 'Image':
              filename = `${chatTitle}.png`;
              break;
            case 'Excel':
              filename = `${chatTitle}.xlsx`;
              break;
            case 'CSV':
              filename = `${chatTitle}.csv`;
              break;
            case 'MD':
              filename = `${chatTitle}.md`;
              break;
            default:
              throw new Error('Unsupported export format');
          }

          console.log('[ShareExportModal] Exporting with conversation data via POST:', { chatId, format, messageCount: conversationData.messages.length });
          
          response = await fetch(postUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationData: conversationData,
            }),
          });
        } else {
          // Fallback to GET request (for existing conversations in mock data)
          switch (format) {
            case 'PDF':
              downloadUrl = `/api/export-chat?format=pdf&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              filename = `${chatTitle}.pdf`;
              break;

            case 'Image':
              downloadUrl = `/api/export-chat?format=image&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              filename = `${chatTitle}.png`;
              break;

            case 'Excel':
              downloadUrl = `/api/export-chat?format=excel&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              filename = `${chatTitle}.xlsx`;
              break;

            case 'CSV':
              downloadUrl = `/api/export-chat?format=csv&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              filename = `${chatTitle}.csv`;
              break;

            case 'MD':
              downloadUrl = `/api/export-chat?format=md&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}${messageIdsParam}`;
              filename = `${chatTitle}.md`;
              break;

            default:
              throw new Error('Unsupported export format');
          }

          console.log('[ShareExportModal] Export URL:', downloadUrl);
          console.log('[ShareExportModal] Messages to export:', messagesToShare);
          response = await fetch(downloadUrl);
        }
      }

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = isPinBoardExport ? 'Failed to export pin board' : 'Failed to export chat';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success toast at top right
      dispatch(
        addToast({
          message: `${format} export completed!`,
          type: 'success',
        })
      );
      
      setExportingFormat(null);
    } catch (error) {
      console.error('Export error:', error);
      // Show error toast at top right
      dispatch(
        addToast({
          message: error instanceof Error ? error.message : `Failed to export as ${format}`,
          type: 'error',
        })
      );
      setExportingFormat(null);
    }
  };

  const handleCancel = () => {
    if (!isSending && !exportingFormat) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isDisabled = isSending || !!exportingFormat;

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
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
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
            Share & Export
          </h3>

          {/* Header with Tabs and Copy Link */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              width: '100%',
            }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', paddingBottom: '16px' }}>
              <button
                onClick={() => !isDisabled && !exportOnly && setActiveTab('Share')}
                disabled={isDisabled || exportOnly}
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: activeTab === 'Share' ? 700 : 600,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: activeTab === 'Share' ? themeColors.gray800() : themeColors.gray700(),
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'Share' ? `2px solid ${themeColors.gray700()}` : 'none',
                  padding: '0 4px 12px',
                  cursor: isDisabled || exportOnly ? 'not-allowed' : 'pointer',
                  opacity: isDisabled || exportOnly ? 0.5 : 1,
                }}
              >
                Share
              </button>
              <button
                onClick={() => !isDisabled && setActiveTab('Export')}
                disabled={isDisabled}
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: activeTab === 'Export' ? 700 : 600,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: activeTab === 'Export' ? themeColors.gray800() : themeColors.gray700(),
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'Export' ? `2px solid ${themeColors.gray700()}` : 'none',
                  padding: '0 4px 12px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                Export
              </button>
            </div>

            {/* Copy Link Button - Only show for conversations, not pinned items, and when showChatLinkOption is true */}
            {!isPinBoardExport && showChatLinkOption && (
              <button
                onClick={handleCopyLink}
                disabled={isDisabled || !chatUrl}
                style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  borderRadius: '2px',
                  cursor: isDisabled || !chatUrl ? 'not-allowed' : 'pointer',
                  opacity: isDisabled || !chatUrl ? 0.5 : 1,
                }}
              >
                <LinkIcon size={16} style={{ color: themeColors.gray700() }} />
                <span
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: themeColors.gray700(),
                  }}
                >
                  Copy Link
                </span>
              </button>
            )}
          </div>


          {/* Content based on active tab */}
          {activeTab === 'Share' && !exportOnly ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minHeight: '340px' }}>
              {/* Email Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <label
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '13px',
                      fontWeight: 600,
                      lineHeight: '24px',
                      letterSpacing: '0.0897px',
                    color: themeColors.textPrimary(),
                  }}
                >
                    Email(s)
                  </label>
                  <span style={{ color: themeColors.primary600(), fontSize: '16px' }}>*</span>
                </div>
                <div
                  style={{
                    background: isDisabled ? themeColors.neutral50() : 'rgba(255, 255, 255, 0.8)',
                    border: `1px solid ${isDisabled ? themeColors.neutral200() : themeColors.gray200()}`,
                    borderRadius: themeRadius.md(),
                    padding: '10px 14px',
                    boxShadow: `0px 1px 4px 0px ${themeColors.gray100()}`,
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <Mail size={20} style={{ color: themeColors.gray500(), flexShrink: 0 }} />
                  <input
                    type="text"
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    disabled={isDisabled}
                    placeholder="Add email(s)"
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'none',
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '16px',
                      fontWeight: 400,
                      lineHeight: '24px',
                      color: isDisabled ? themeColors.neutral400() : themeColors.gray400(),
                      outline: 'none',
                    }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '13px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: themeColors.gray500(),
                    margin: 0,
                  }}
                >
                  Separate multiple emails with commas
                </p>
              </div>

              {/* Message Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <label
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '13px',
                      fontWeight: 600,
                      lineHeight: '24px',
                      letterSpacing: '0.0897px',
                      color: themeColors.textPrimary(),
                    }}
                  >
                    Message
                  </label>
                  <span style={{ color: themeColors.primary600(), fontSize: '13px', fontWeight: 500 }}>
                    (optional)
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isDisabled}
                  placeholder="Enter a short message..."
                  style={{
                    minHeight: '120px',
                    background: isDisabled ? themeColors.neutral50() : 'rgba(255, 255, 255, 0.8)',
                    border: `1px solid ${isDisabled ? themeColors.neutral200() : themeColors.gray200()}`,
                    borderRadius: '8px',
                    padding: '12px 14px',
                    boxShadow: '0px 1px 4px 0px #ECEEF2',
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '16px',
                    fontWeight: 400,
                    lineHeight: '24px',
                    color: isDisabled ? themeColors.neutral400() : themeColors.gray400(),
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {/* Include Chat Link - Only show for conversations, not pinned items, and when showChatLinkOption is true */}
                {!isPinBoardExport && showChatLinkOption && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      id="include-chat-link"
                      checked={includeChatLink}
                      onChange={(e) => setIncludeChatLink(e.target.checked)}
                      disabled={isDisabled}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    />
                    <label
                      htmlFor="include-chat-link"
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '13px',
                        fontWeight: 600,
                        lineHeight: '24px',
                        letterSpacing: '0.0897px',
                        color: isDisabled ? themeColors.gray500() : themeColors.gray700(),
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Include chat link
                    </label>
                  </div>
                )}

                {/* Include Attachment */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      id="include-attachment"
                      checked={includeAttachment}
                      onChange={(e) => {
                        setIncludeAttachment(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedFormat(null);
                        } else {
                          // Set PDF as default when Include is checked
                          setSelectedFormat('PDF');
                        }
                      }}
                      disabled={isDisabled}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    />
                    <label
                      htmlFor="include-attachment"
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '13px',
                        fontWeight: 600,
                        lineHeight: '24px',
                        letterSpacing: '0.0897px',
                        color: isDisabled ? themeColors.gray500() : themeColors.gray700(),
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Include
                    </label>
                  </div>

                  {/* Format Buttons */}
                  {includeAttachment && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(['Image', 'PDF', 'Excel', 'CSV', 'MD'] as ExportFormat[]).map((format) => {
                        const spreadsheetFormatBlocked =
                          !spreadsheetExportAllowed && (format === 'Excel' || format === 'CSV');
                        const formatBtnDisabled = isDisabled || spreadsheetFormatBlocked;
                        return (
                        <button
                          key={format}
                          onClick={() => setSelectedFormat(format)}
                          disabled={formatBtnDisabled}
                          title={spreadsheetFormatBlocked ? tableOnlyFormatTooltip : undefined}
                          style={{
                            display: 'flex',
                            gap: '3px',
                            alignItems: 'center',
                            padding: '4px 6px 4px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${formatBtnDisabled ? themeColors.neutral200() : themeColors.gray200()}`,
                            background: formatBtnDisabled
                              ? themeColors.neutral100()
                              : selectedFormat === format
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'rgba(255, 255, 255, 0.2)',
                            cursor: formatBtnDisabled ? 'not-allowed' : 'pointer',
                            opacity: formatBtnDisabled ? 0.5 : 1,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'Manrope, var(--font-manrope)',
                              fontSize: '10px',
                              fontWeight: 600,
                              lineHeight: '16px',
                              letterSpacing: '0.18px',
                              color: formatBtnDisabled ? themeColors.neutral400() : themeColors.gray600(),
                            }}
                          >
                            {format}
                          </span>
                          {selectedFormat === format && (
                            <Check size={12} style={{ color: themeColors.success() }} />
                          )}
                        </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {sendError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(232, 96, 75, 0.08)',
                    border: '1px solid #FFE5E5',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: '13px',
                      fontWeight: 500,
                      lineHeight: '20px',
                      color: themeColors.error(),
                      margin: 0,
                    }}
                  >
                    {sendError}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Export Tab */
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                paddingTop: '8px',
                minHeight: '340px',
              }}
            >
              {(['Image', 'PDF', 'Excel', 'CSV', 'MD'] as ExportFormat[]).map((format) => {
                // Show loader only on the clicked button
                const isExportingThisFormat = exportingFormat === format;
                const spreadsheetFormatBlocked =
                  !spreadsheetExportAllowed && (format === 'Excel' || format === 'CSV');
                const isDisabledFormat =
                  (!!exportingFormat && !isExportingThisFormat) || spreadsheetFormatBlocked;

                return (
                  <div
                    key={format}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <button
                      onClick={() => handleExport(format)}
                      disabled={isDisabledFormat}
                      title={spreadsheetFormatBlocked ? tableOnlyFormatTooltip : undefined}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${
                          isDisabledFormat ? themeColors.neutral100() : themeColors.primary200()
                        }`,
                        background: isDisabledFormat ? themeColors.neutral50() : 'transparent',
                        boxShadow: isDisabledFormat
                          ? 'none'
                          : '0px 1px 2px 0px rgba(236, 232, 255, 1)',
                        cursor: isDisabledFormat ? 'not-allowed' : 'pointer',
                        opacity: isDisabledFormat ? 0.5 : 1,
                        width: '74px',
                        height: '76px',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDisabledFormat) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDisabledFormat) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {/* Icon */}
                      <div style={{ position: 'relative', width: '24px', height: '27px' }}>
                        {isExportingThisFormat ? (
                          <div style={{ position: 'absolute', top: 0, left: 0 }}>
                            <Image
                              src="/animated-spinner.svg"
                              alt="Loading"
                              width={24}
                              height={24}
                              style={{ opacity: 0.8 }}
                            />
                          </div>
                        ) : (
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
                                color: themeColors.gray400(),
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
                                background:
                                  format === 'Image'
                                    ? themeColors.primary700()
                                    : format === 'PDF'
                                    ? themeColors.error()
                                    : format === 'Excel' || format === 'CSV'
                                    ? themeColors.success()
                                    : themeColors.secondary500(),
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
                                  : format}
                              </span>
                            </div>
                          </div>
                        )}
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
                    </button>
                    {/* Exporting text - outside and below the button */}
                    {isExportingThisFormat && (
                      <span
                        style={{
                          fontFamily: 'Manrope, var(--font-manrope)',
                          fontSize: '10px',
                          fontWeight: 500,
                          lineHeight: '16px',
                          letterSpacing: '0.18px',
                          color: themeColors.gray400(),
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Exporting...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', width: '100%', marginTop: '32px' }}>
            {activeTab === 'Share' && !exportOnly ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSending}
                  style={{
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: isSending ? themeColors.neutral400() : themeColors.gray700(),
                    background: 'none',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    opacity: isSending ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || !emails.trim()}
                  style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    fontFamily: 'Manrope, var(--font-manrope)',
                    fontSize: '13px',
                    fontWeight: 700,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: isSending || !emails.trim() ? themeColors.neutral400() : themeColors.primary50(),
                    background:
                      isSending || !emails.trim() ? themeColors.neutral100() : themeColors.primary600(),
                    border: `1px solid ${
                      isSending || !emails.trim() ? themeColors.neutral200() : themeColors.primary600()
                    }`,
                    padding: '6px 14px',
                    borderRadius: '6px',
                    cursor: isSending || !emails.trim() ? 'not-allowed' : 'pointer',
                    opacity: 1,
                  }}
                >
                  <Send size={16} style={{ color: isSending || !emails.trim() ? themeColors.neutral400() : themeColors.primary50() }} />
                  Send
                </button>
              </>
            ) : (
              <button
                onClick={handleCancel}
                disabled={!!exportingFormat}
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: exportingFormat ? themeColors.neutral400() : themeColors.gray700(),
                  background: 'none',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: exportingFormat ? 'not-allowed' : 'pointer',
                  opacity: exportingFormat ? 0.5 : 1,
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}


'use client';

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Send } from 'lucide-react';
import { useClipboard } from '@/hooks/useClipboard';
import { useAppDispatch, useAppStore } from '@/store/hooks';
import { addToast, removeToast } from '@/store/slices/uiSlice';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/modal';
import { TabsList, Tab } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button-enhanced';
import { ShareTab } from './ShareTab';
import { ExportTab } from './ExportTab';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

export type ExportFormat = 'Image' | 'PDF' | 'Excel' | 'CSV' | 'MD';

interface ShareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle?: string;
}

export default function ShareExportModal({
  isOpen,
  onClose,
  chatId,
  chatTitle = 'chat',
}: ShareExportModalProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { copy } = useClipboard();
  const [activeTab, setActiveTab] = useState<'Share' | 'Export'>('Share');

  // Share tab state
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [includeChatLink, setIncludeChatLink] = useState(true);
  const [includeAttachment, setIncludeAttachment] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>('PDF');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Export tab state
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  // Get chat URL
  const chatUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/chat/${chatId}` : '';

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('Share');
      setEmails('');
      setMessage('');
      setIncludeChatLink(true);
      setIncludeAttachment(true);
      setSelectedFormat('PDF');
      setIsSending(false);
      setSendError(null);
      setExportingFormat(null);
    }
  }, [isOpen]);

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

    const generatingMessage =
      includeAttachment && selectedFormat ? `Generating ${selectedFormat}...` : null;

    // Show persistent loading toast if generating attachment
    if (generatingMessage) {
      dispatch(
        addToast({
          message: generatingMessage,
          type: 'info',
          duration: 0,
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
          chatId,
          emails: emailList,
          message: message.trim() || undefined,
          includeChatLink,
          format: includeAttachment ? selectedFormat : undefined,
          title: chatTitle,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send message' }));
        throw new Error(error.message || 'Failed to send message');
      }

      // Remove generating toast if it exists
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

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setSendError(errorMessage);
      setIsSending(false);

      // Remove generating toast on error
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

      switch (format) {
        case 'PDF':
          downloadUrl = `/api/export-chat?format=pdf&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}`;
          filename = `${chatTitle}.pdf`;
          break;
        case 'Image':
          downloadUrl = `/api/export-chat?format=image&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}`;
          filename = `${chatTitle}.png`;
          break;
        case 'Excel':
          downloadUrl = `/api/export-chat?format=excel&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}`;
          filename = `${chatTitle}.xlsx`;
          break;
        case 'CSV':
          downloadUrl = `/api/export-chat?format=csv&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}`;
          filename = `${chatTitle}.csv`;
          break;
        case 'MD':
          downloadUrl = `/api/export-chat?format=md&chatId=${chatId}&title=${encodeURIComponent(chatTitle)}`;
          filename = `${chatTitle}.md`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        let errorMessage = 'Failed to export chat';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        } catch {
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

      dispatch(
        addToast({
          message: `${format} export completed!`,
          type: 'success',
        })
      );

      setExportingFormat(null);
    } catch (error) {
      console.error('Export error:', error);
      dispatch(
        addToast({
          message: `Failed to export as ${format}`,
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

  const isDisabled = isSending || !!exportingFormat;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <ModalHeader>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            width: '100%',
          }}
        >
          <span>Share & Export</span>
          <button
            onClick={handleCopyLink}
            disabled={isDisabled}
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              padding: '4px',
              borderRadius: theme.borderRadius.sm,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
            <LinkIcon size={16} style={{ color: cssVar(CSS_VARS.textSecondary) }} />
            <span
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: theme.typography.text.small.size,
                fontWeight: theme.typography.weights.semibold.value,
                lineHeight: '24px',
                letterSpacing: '0.0897px',
                color: cssVar(CSS_VARS.textSecondary),
              }}
            >
              Copy Link
            </span>
          </button>
        </div>
      </ModalHeader>

      <ModalContent>
        {/* Tabs */}
        <TabsList value={activeTab} onValueChange={(v) => setActiveTab(v as 'Share' | 'Export')} disabled={isDisabled}>
          <Tab value="Share">Share</Tab>
          <Tab value="Export">Export</Tab>
        </TabsList>

        {/* Content based on active tab */}
        {activeTab === 'Share' ? (
          <ShareTab
            emails={emails}
            onEmailsChange={setEmails}
            message={message}
            onMessageChange={setMessage}
            includeChatLink={includeChatLink}
            onIncludeChatLinkChange={setIncludeChatLink}
            includeAttachment={includeAttachment}
            onIncludeAttachmentChange={setIncludeAttachment}
            selectedFormat={selectedFormat}
            onSelectedFormatChange={setSelectedFormat}
            isDisabled={isDisabled}
            sendError={sendError}
            spreadsheetFormatsEnabled={false}
          />
        ) : (
          <ExportTab
            exportingFormat={exportingFormat}
            onExport={handleExport}
            spreadsheetFormatsEnabled={false}
          />
        )}
      </ModalContent>

      <ModalFooter>
        {activeTab === 'Share' ? (
          <>
            <Button variant="text" onClick={handleCancel} disabled={isSending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={isSending || !emails.trim()}
              icon={<Send size={16} />}
            >
              Send
            </Button>
          </>
        ) : (
          <Button variant="text" onClick={handleCancel} disabled={!!exportingFormat}>
            Close
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}


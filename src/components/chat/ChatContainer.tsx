'use client';

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';
import WelcomeSection from './WelcomeSection';
import { ScrollToBottomButton } from './ScrollToBottomButton';
import { GradientDivider } from '@/components/ui/GradientDivider';
import { useChat } from '@/hooks/useChat';
import { useAppSelector } from '@/store/hooks';
import { generateId } from '@/lib/utils/id';
import { usePinnedItems } from '@/hooks/usePinnedItems';
import { useConversations } from '@/hooks/useConversations';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useConsent } from '@/hooks/useConsent';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { CONTAINER_STYLES } from '@/lib/styles/commonStyles';
import { ChatActionsProvider } from '@/contexts/ChatActionsContext';
import ShareExportModal from '@/components/chats/ShareExportModal';
import CopyAsModal from '@/components/chats/CopyAsModal';
import LoadingIndicator from '@/components/chats/LoadingIndicator';
import { PinnedItemModal } from '@/components/rightPanel/PinnedItemModal';
import { ConsentModal } from '@/components/consent/ConsentModal';
import { getProState, setProState } from '@/lib/chatProState';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Message } from '@/types';

export default function ChatContainer() {
  const addToInputRef = useRef<((text: string) => void) | null>(null);
  const isProRef = useRef(false);
  const [isPro, setIsProState] = useState(getProState); // Module-level: persists welcome->chat, resets on refresh
  const setIsPro = useCallback((value: boolean) => {
    setIsProState(value);
    isProRef.current = value;
    setProState(value);
  }, []);
  // Keep isProRef in sync with isPro (for retry/regenerate in useChat)
  useEffect(() => {
    isProRef.current = isPro;
  }, [isPro]);
  const { activeConversation, isStreaming, sendMessage } = useChat({ isProRef });
  const { shouldShowConsentPopup, hasAccepted, isLoading: consentLoading, refetch: refetchConsent } = useConsent();
  const queryClient = useQueryClient();
  const { rightPanelOpen } = useAppSelector((state) => state.ui);
  // Below xl (1280px), right panel overlays the chat like the left sidebar; no layout shrink.
  const isXlUp = useMediaQuery('(min-width: 1280px)');
  const reserveSpaceForRightPanel = rightPanelOpen && isXlUp;
  const { conversations, replacedConversationIds, activeConversationId } = useAppSelector((state) => state.chat);
  const { createPinnedItem } = usePinnedItems();
  const pathname = usePathname();
  const { isLoading: conversationsLoading, fetchConversationById } = useConversations();
  const [isShareExportModalOpen, setIsShareExportModalOpen] = useState(false);
  const [shareMessageId, setShareMessageId] = useState<string | null>(null);
  const [isCopyAsModalOpen, setIsCopyAsModalOpen] = useState(false);
  const [copyMessageId, setCopyMessageId] = useState<string | null>(null);
  const [tableChartShareContent, setTableChartShareContent] = useState<{ type: 'table' | 'chart'; content: string; title?: string } | null>(null);
  const [tableChartCopyContent, setTableChartCopyContent] = useState<{ type: 'table' | 'chart'; content: string; title?: string } | null>(null);
  const [pinModalContent, setPinModalContent] = useState<{ content: string; title?: string; type: 'table' | 'chart' | 'text'; messageId?: string } | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Get chatId from URL to check if we're on a chat route
  const chatIdFromUrl = pathname?.startsWith('/chat/')
    ? pathname.split('/chat/')[1]?.split('/')[0]
    : null;

  // Prefer conversation by URL from Redux so we never flash empty when switching chats.
  // When URL id was replaced (e.g. first message: server sent new sessionId), keep showing the
  // active conversation so spinner and typing animation stay visible until stream completes.
  const displayConversation = chatIdFromUrl
    ? (conversations.find((c) => c.id === chatIdFromUrl) ??
       (replacedConversationIds.includes(chatIdFromUrl) && activeConversationId
         ? (conversations.find((c) => c.id === activeConversationId) ?? null)
         : null))
    : activeConversation;

  const displayMessages = useMemo(
    () => displayConversation?.messages ?? [],
    [displayConversation]
  );

  const messagesForRender = useMemo(() => {
    if (!displayConversation) return [];
    const messages = displayConversation.messages ?? [];
    if (messages.length === 0) return messages;

    const lastMessage = messages[messages.length - 1];
    const shouldShowPendingAssistant =
      Boolean(chatIdFromUrl) &&
      lastMessage.role === 'user';

    if (!shouldShowPendingAssistant) return messages;

    const pendingAssistantMessage: Message = {
      id: `pending-assistant-${displayConversation.id}-${lastMessage.id}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    return [...messages, pendingAssistantMessage];
  }, [displayConversation, chatIdFromUrl]);

  const hasDisplayMessages = messagesForRender.length > 0;
  const hasPendingAssistantResponse = useMemo(() => {
    if (!displayConversation) return false;
    const messages = displayConversation.messages ?? [];
    if (messages.length === 0) return false;
    const last = messages[messages.length - 1];
    return last.role === 'user';
  }, [displayConversation]);

  const lastMessageContent = messagesForRender.length
    ? (messagesForRender[messagesForRender.length - 1]?.content ?? '')
    : '';

  const {
    messagesEndRef,
    scrollContainerRef,
    showScrollButton,
    scrollToBottom,
  } = useAutoScroll({
    isStreaming,
    messagesLength: messagesForRender.length,
    lastMessageContentLength: lastMessageContent.length,
  });

  // Show welcome screen only if:
  // 1. We have no messages AND
  // 2. We're on the home page (not on a chat route)
  const shouldShowWelcome = !hasDisplayMessages && !chatIdFromUrl;

  // Show consent popup on welcome screen when user hasn't accepted yet (declined or not in DB)
  const showConsentModal =
    shouldShowWelcome &&
    !consentLoading &&
    shouldShowConsentPopup &&
    !hasAccepted;

  // Only show loading when we truly have no conversation to display (initial load or missing id).
  // Do NOT show loading when we have displayConversation (e.g. from store), so switching chats
  // and refetches don't hide content.
  const isLoadingChat =
    Boolean(chatIdFromUrl) &&
    !displayConversation &&
    (conversationsLoading || activeConversationId === chatIdFromUrl);

  // If chat ends with a user message after refresh/navigation, poll conversation updates until assistant reply arrives.
  // This keeps UI in sync when the original stream was interrupted by page refresh/navigation.
  useEffect(() => {
    if (!chatIdFromUrl || !hasPendingAssistantResponse) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      await fetchConversationById(chatIdFromUrl, { background: true, force: true });
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [chatIdFromUrl, hasPendingAssistantResponse, fetchConversationById]);

  // Reset scroll position when switching to welcome screen (new chat)
  useEffect(() => {
    if (shouldShowWelcome && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [shouldShowWelcome, scrollContainerRef]);

  // If URL has a message hash (e.g. #message-<id>), scroll to that message after render.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#message-')) return;

    const targetId = hash.slice(1);
    const scrollToTarget = () => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const timeout = setTimeout(scrollToTarget, 0);
    return () => clearTimeout(timeout);
  }, [messagesForRender, pathname]);

  // Memoize the sendMessage handler to prevent re-renders when showScrollButton changes
  const handleSendMessage = useCallback(async (message: string) => {
    try {
      await sendMessage(message);
      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [sendMessage, scrollToBottom]);

  // Memoize the addToInput handler
  const handleAddToInput = useCallback((text: string) => {
    if (addToInputRef.current) {
      addToInputRef.current(text);
    } else {
      console.warn('addToInput callback not available - ChatInput may not be mounted yet');
    }
  }, []);

  // Memoize the context value to prevent re-renders when showScrollButton changes
  const chatActionsValue = useMemo(() => ({
    sendMessage: handleSendMessage,
    addToInput: handleAddToInput,
    scrollToBottom,
  }), [handleSendMessage, handleAddToInput, scrollToBottom]);

  // Handler to open Share & Export modal with specific message
  const handleOpenShareExportModal = useCallback((messageId: string) => {
    setShareMessageId(messageId);
    setIsShareExportModalOpen(true);
  }, []);

  // Handler to open Copy As modal with specific message
  const handleOpenCopyAsModal = useCallback((messageId: string) => {
    setCopyMessageId(messageId);
    setIsCopyAsModalOpen(true);
  }, []);

  // Handler to open Share & Export modal for table/chart
  const handleOpenTableChartShare = useCallback((type: 'table' | 'chart', content: string, title?: string) => {
    console.log('[ChatContainer] Opening Share & Export modal for table/chart:', { type, title, contentLength: content.length });
    setShareMessageId(null); // Clear any message ID
    setTableChartShareContent({ type, content, title });
    setIsShareExportModalOpen(true);
  }, []);

  // Handler to open Copy As modal for table/chart
  const handleOpenTableChartCopy = useCallback((type: 'table' | 'chart', content: string, title?: string) => {
    console.log('[ChatContainer] Opening Copy As modal for table/chart:', { type, title, contentLength: content.length });
    setCopyMessageId(null); // Clear any message ID
    setTableChartCopyContent({ type, content, title });
    setIsCopyAsModalOpen(true);
  }, []);

  // Handler to open Pin modal for any content (table/chart/text)
  const handleOpenPinModal = useCallback((content: string, title?: string, type: 'table' | 'chart' | 'text' = 'text', messageId?: string) => {
    console.log('[ChatContainer] Opening Pin modal:', { type, title, contentLength: content.length, messageId });
    setPinModalContent({ content, title, type, messageId });
    setIsPinModalOpen(true);
  }, []);

  // Consent accepted - refetch to update UI
  const handleConsentAccept = useCallback(() => {
    refetchConsent();
    queryClient.invalidateQueries({ queryKey: ['consent'] });
  }, [refetchConsent, queryClient]);

  // Handler to actually pin the item
  const handlePinItem = useCallback((name: string, note: string) => {
    if (!pinModalContent || !displayConversation) return;

    // For text messages, use messageId from modal (passed when pinning from message actions) or fallback to content match
    let messageId = generateId(pinModalContent.type);
    if (pinModalContent.type === 'text') {
      if (pinModalContent.messageId) {
        messageId = pinModalContent.messageId;
      } else {
        // Fallback: try to find the message in the conversation by content
        const matchingMessage = displayConversation.messages.find(
          (msg) => msg.role === 'assistant' && msg.content === pinModalContent.content
        );
        if (matchingMessage?.id) {
          messageId = matchingMessage.id;
        }
      }
    }

    // Create pinned item via API (which will also update Redux)
    const pinnedItem = {
      id: generateId('pinned'),
      messageId,
      conversationId: displayConversation.id,
      content: pinModalContent.content,
      title: name,
      note: note || undefined,
      type: 'response' as const,
    };

    // Create via API - this will add it to mock data and Redux
    createPinnedItem(pinnedItem);

    // Close modal
    setIsPinModalOpen(false);
    setPinModalContent(null);
  }, [pinModalContent, displayConversation, createPinnedItem]);

  const exportableConversationMessages = useMemo(
    () =>
      displayConversation
        ? displayConversation.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
          }))
        : [],
    [displayConversation]
  );

  const renderDisplayMessages = useCallback(() => {
    const lastUserMessageIndex = (() => {
      for (let i = messagesForRender.length - 1; i >= 0; i--) {
        if (messagesForRender[i].role === 'user') return i;
      }
      return -1;
    })();
    const lastAssistantMessageIndex = (() => {
      for (let i = messagesForRender.length - 1; i >= 0; i--) {
        if (messagesForRender[i].role === 'assistant') return i;
      }
      return -1;
    })();

    return messagesForRender.map((message, index) => (
      <ChatMessage
        key={message.id}
        message={message}
        isLastUserMessage={message.role === 'user' && index === lastUserMessageIndex}
        isLastAssistantMessage={message.role === 'assistant' && index === lastAssistantMessageIndex}
        isLastStreamingMessage={
          isStreaming && index === messagesForRender.length - 1 && message.role === 'assistant'
        }
        onShareModalOpen={handleOpenShareExportModal}
        onCopyModalOpen={handleOpenCopyAsModal}
        onTableChartShare={handleOpenTableChartShare}
        onTableChartCopy={handleOpenTableChartCopy}
        onTableChartPin={handleOpenPinModal}
      />
    ));
  }, [
    messagesForRender,
    isStreaming,
    handleOpenShareExportModal,
    handleOpenCopyAsModal,
    handleOpenTableChartShare,
    handleOpenTableChartCopy,
    handleOpenPinModal,
  ]);

  return (
    <div
      id="chat-container"
      className={cn(
        'flex h-full w-full flex-col bg-gray-50 relative',
        // Right panel: overlay on tablet / <1280px; reserve width only on xl+ when open
        reserveSpaceForRightPanel && 'pr-[558px]'
      )}
    >
      {hasDisplayMessages && displayConversation && (
        <div
          style={{
            ...CONTAINER_STYLES.chatContainer,
            ...CONTAINER_STYLES.chatContainerWithPadding(reserveSpaceForRightPanel),
            position: 'relative',
          }}
        >
          <div style={{ ...CONTAINER_STYLES.contentWidth, position: 'relative' }}>
            <ChatHeader conversation={displayConversation} />
            <GradientDivider direction="top" />
          </div>
        </div>
      )}
      <div
        ref={scrollContainerRef}
        className={`custom-scrollbar flex-1 ${shouldShowWelcome ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{
          // Use `flex` (not `inline-flex`) so this container takes full available width.
          // This prevents header/input and the message list from re-centering differently
          // when the viewport width changes (responsive resize).
          display: 'flex',
          height: '900px',
          ...CONTAINER_STYLES.scrollContainer(reserveSpaceForRightPanel),
          flexDirection: 'column',
          // Keep horizontal alignment consistent with header/input containers.
          // Otherwise, on narrower (tablet) widths the message column can "stick" left
          // while header/input remain centered, which looks like a side-shift.
          alignItems: 'center',
          justifyContent: hasDisplayMessages ? 'flex-start' : 'center',
          gap: '16px',
          position: 'relative',
        }}
      >
        {shouldShowWelcome ? (
          <WelcomeSection
            onPromptClick={sendMessage}
            onSendMessage={sendMessage}
            isLoading={isStreaming}
            isPro={isPro}
            onIsProChange={setIsPro}
          />
        ) : isLoadingChat ? (
          <div className="flex flex-1 items-center justify-center" style={CONTAINER_STYLES.contentWidth}>
            <LoadingIndicator text="Loading conversation..." />
          </div>
        ) : hasDisplayMessages ? (
          <main
            id="chat-messages"
            className="mx-auto"
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Chat conversation"
            style={CONTAINER_STYLES.contentWidth}
          >
            <ChatActionsProvider
              sendMessage={chatActionsValue.sendMessage}
              addToInput={chatActionsValue.addToInput}
              scrollToBottom={chatActionsValue.scrollToBottom}
            >
              <div className="mt-5">
                {renderDisplayMessages()}
              </div>
            </ChatActionsProvider>
            <div ref={messagesEndRef} aria-hidden="true" />
          </main>
        ) : pathname === '/chat' ? (
          // Show empty chat panel on /chat route (new chat) - ready for input
          <main
            id="chat-messages"
            className="mx-auto"
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Chat conversation"
            style={CONTAINER_STYLES.contentWidth}
          >
            <ChatActionsProvider
              sendMessage={chatActionsValue.sendMessage}
              addToInput={chatActionsValue.addToInput}
              scrollToBottom={chatActionsValue.scrollToBottom}
            >
              <div />
            </ChatActionsProvider>
            <div ref={messagesEndRef} aria-hidden="true" />
          </main>
        ) : null}
      </div>
      {hasDisplayMessages && (
        <div
          style={{
            ...CONTAINER_STYLES.chatContainer,
            ...CONTAINER_STYLES.chatInputContainer(reserveSpaceForRightPanel),
            position: 'relative',
          }}
        >
          <div style={{ ...CONTAINER_STYLES.contentWidth, position: 'relative' }}>
            <GradientDivider direction="bottom" />
            {showScrollButton && <ScrollToBottomButton onClick={scrollToBottom} />}
            <ChatInput
              onSendMessage={async (message, attachments, pinnedItems, isProVal) => {
                await sendMessage(message, attachments, pinnedItems, isProVal);
              }}
              isLoading={isStreaming}
              onAddToInputRef={(callback) => {
                addToInputRef.current = callback;
              }}
              isPro={isPro}
              onIsProChange={setIsPro}
            />
          </div>
        </div>
      )}

      {/* Share & Export Modal */}
      {displayConversation && (
        <ShareExportModal
          isOpen={isShareExportModalOpen}
          onClose={() => {
            setIsShareExportModalOpen(false);
            setShareMessageId(null);
            setTableChartShareContent(null);
          }}
          chatId={displayConversation.id}
          chatTitle={displayConversation.title}
          showChatLinkOption={!tableChartShareContent && !shareMessageId}
          shareMessageId={shareMessageId}
          conversationMessages={exportableConversationMessages}
          tableChartContent={tableChartShareContent}
          exportOnly={true}
        />
      )}

      {/* Copy As Modal */}
      {displayConversation && (
        <CopyAsModal
          isOpen={isCopyAsModalOpen}
          onClose={() => {
            setIsCopyAsModalOpen(false);
            setCopyMessageId(null);
            setTableChartCopyContent(null);
          }}
          chatId={displayConversation.id}
          chatTitle={displayConversation.title}
          shareMessageId={copyMessageId}
          conversationMessages={exportableConversationMessages}
          tableChartContent={tableChartCopyContent}
        />
      )}

      {/* Data Storage Consent Modal - non-dismissable until user chooses */}
      <ConsentModal isOpen={showConsentModal} onAccept={handleConsentAccept} />

      {/* Pin Modal */}
      {pinModalContent && (
        <PinnedItemModal
          isOpen={isPinModalOpen}
          onClose={() => {
            setIsPinModalOpen(false);
            setPinModalContent(null);
          }}
          item={{
            id: '',
            content: pinModalContent.content,
            title: pinModalContent.title,
            type: 'response',
          }}
          isPinMode={true}
          onPin={handlePinItem}
        />
      )}
    </div>
  );
}

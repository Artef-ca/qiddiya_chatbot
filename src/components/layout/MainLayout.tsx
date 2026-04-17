'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import ChatContainer from '@/components/chat/ChatContainer';
import ChatListingPage from '@/components/chats/ChatListingPage';
import PinnedListingPage from '@/components/pinned/PinnedListingPage';
import GroupListingPage from '@/components/groups/GroupListingPage';
import GroupDetailPage from '@/components/groups/GroupDetailPage';
import SettingsPage from '@/components/settings/SettingsPage';
import RightPanel from '@/components/rightPanel/RightPanel';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSidebarOpen, toggleRightPanel, setRightPanelOpen, addToast } from '@/store/slices/uiSlice';
import { setActiveConversation } from '@/store/slices/chatSlice';
import { clearProState } from '@/lib/chatProState';
import { Button } from '@/components/ui/button';
import { Menu, PanelRightDashed } from 'lucide-react';
import Image from 'next/image';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { useChat } from '@/hooks/useChat';
import { useConversations } from '@/hooks/useConversations';
import NotificationContainer from '@/components/chats/NotificationContainer';

export default function MainLayout() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, rightPanelOpen } = useAppSelector((state) => state.ui);
  const { activeConversation, conversations, activeConversationId, isStreaming } = useChat();
  const { isLoading: conversationsLoading, isFetched: conversationsFetched, fetchConversationById } = useConversations();

  // Extract chat id from URL: conv-<number> for mock list, session_id after chat API response
  const chatIdFromUrl: string | null = pathname?.startsWith('/chat/')
    ? pathname.split('/chat/')[1]?.split('/')[0] ?? null
    : null;

  // Use refs to track redirect state and prevent infinite loops
  const isRedirectingRef = useRef(false);
  const lastProcessedChatIdRef = useRef<string | null>(null);
  const prevPathnameRef = useRef<string | null>(null);
  const justSetActiveFromUrlRef = useRef(false);

  // Sync URL and Redux state: URL is the source of truth
  // When URL changes -> update Redux
  // When Redux changes (user action) -> update URL
  useEffect(() => {
    // Skip if we're already redirecting to prevent loops
    if (isRedirectingRef.current) {
      return;
    }

    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // Clear "just set active" when we're not on a chat URL (so next open-from-sidebar can set it)
    if (!chatIdFromUrl) {
      justSetActiveFromUrlRef.current = false;
    }

    // Priority 1: URL has chatId - set it as active conversation immediately
    // This prevents the welcome screen flash on page refresh
    if (chatIdFromUrl) {
      // User clicked New Chat (cleared active) but pathname hasn't updated yet: go to / so welcome shows.
      // Skip if we just set active from URL (state may not have flushed yet) to avoid resetting URL on first click.
      if (activeConversationId === null && !conversationsLoading && conversations.length > 0 && prevPathname != null && prevPathname !== '/' && !justSetActiveFromUrlRef.current) {
        clearProState();
        router.replace('/');
        return;
      }
      justSetActiveFromUrlRef.current = false;
      // User opened a chat from sidebar or landed on /chat/xxx (prevPathname / or null): set active from URL so we don't redirect
      if (activeConversationId === null && !conversationsLoading && (prevPathname === '/' || prevPathname == null)) {
        if (lastProcessedChatIdRef.current !== chatIdFromUrl) {
          lastProcessedChatIdRef.current = chatIdFromUrl;
          dispatch(setActiveConversation(chatIdFromUrl));
          justSetActiveFromUrlRef.current = true;
        }
        return;
      }

      // Wait for conversations to finish (success or error) before validating - so deployed env redirects when API fails or returns empty
      if (!conversationsFetched || conversationsLoading) {
        // Set active conversation from URL while loading so UI can show loading state
        if (activeConversationId !== chatIdFromUrl && lastProcessedChatIdRef.current !== chatIdFromUrl) {
          lastProcessedChatIdRef.current = chatIdFromUrl;
          dispatch(setActiveConversation(chatIdFromUrl));
          justSetActiveFromUrlRef.current = true;
        }
        return;
      }

      const conversationInList = conversations.find((c) => c.id === chatIdFromUrl);
      const hasMessages = (conversationInList?.messages?.length ?? 0) > 0;

      // ChatGPT-style: Show cached immediately if available, refresh in background
      if (conversationInList && hasMessages) {
        // Conversation with messages exists in Redux - show immediately (instant)
        if (activeConversationId !== chatIdFromUrl && lastProcessedChatIdRef.current !== chatIdFromUrl) {
          lastProcessedChatIdRef.current = chatIdFromUrl;
          dispatch(setActiveConversation(chatIdFromUrl));
        }
        // Refresh in background only when NOT streaming — while streaming, Redux has the in-progress
        // assistant message (spinner); a background fetch would overwrite it with server data and hide the spinner
        if (!isStreaming) {
          fetchConversationById(chatIdFromUrl, { background: true });
        }
        return;
      }

      // Conversation not in list or has no messages - fetch it (hits events table)
      if (!conversationInList || !hasMessages) {
        fetchConversationById(chatIdFromUrl).then((fetched) => {
          if (fetched) {
            dispatch(setActiveConversation(chatIdFromUrl));
          } else {
            dispatch(addToast({
              type: 'error',
              message: 'This conversation is no longer available.',
            }));
            isRedirectingRef.current = true;
            clearProState();
            dispatch(setActiveConversation(null));
            if (pathname !== '/') {
              router.push('/');
            }
            setTimeout(() => {
              isRedirectingRef.current = false;
              lastProcessedChatIdRef.current = null;
            }, 100);
          }
        });
        return;
      }

      if (activeConversationId !== chatIdFromUrl && lastProcessedChatIdRef.current !== chatIdFromUrl) {
        lastProcessedChatIdRef.current = chatIdFromUrl;
        dispatch(setActiveConversation(chatIdFromUrl));
      }
    }
    // At / or /chat (no id) or other list pages
    else if (pathname === '/' || pathname === '/chats' || pathname === '/pinned' || pathname === '/groups' || pathname === '/settings' || pathname?.startsWith('/groups/')) {
      if (activeConversationId) {
        const activeConv = conversations.find((c) => c.id === activeConversationId);
        const hasMessagesInActive = activeConv?.messages && activeConv.messages.length > 0;

        // User just clicked New Chat (navigated to / from another path): clear active so welcome shows (check first, before hasMessages)
        if (pathname === '/' && prevPathname !== '/' && prevPathname !== null) {
          lastProcessedChatIdRef.current = null;
          dispatch(setActiveConversation(null));
          return;
        }
        // Sync URL to /chat/<id> when we're at /chat (no id) with messages (conv-<number> for mock, session_id for API)
        if (pathname === '/chat' && hasMessagesInActive) {
          router.replace(`/chat/${activeConversationId}`);
          return;
        }
        // First message flow: at / or /chat with messages – keep active so chat shows
        if ((pathname === '/' || pathname === '/chat') && hasMessagesInActive) return;

        // At /chat (no id) with active = viewing a chat from sidebar; don't clear even if no messages yet
        if (pathname === '/chat') return;

        // At / without messages or other list pages: clear active
        lastProcessedChatIdRef.current = null;
        dispatch(setActiveConversation(null));
      }
    }
    // Priority 3: No chatId in URL but we have active conversation (and not on home, chats, pinned, groups, or settings) - navigate to it
    else if (activeConversationId && pathname !== '/' && pathname !== '/chat' && pathname !== '/chats' && pathname !== '/pinned' && pathname !== '/groups' && pathname !== '/settings' && !pathname?.startsWith('/groups/')) {
      // Wait for conversations to load before validating
      if (conversationsLoading) {
        return;
      }

      const conversationExists = conversations.some(
        (conv) => conv.id === activeConversationId
      );

      if (conversationExists) {
        // Show conversation id in URL (conv-<number> for mock, session_id for API)
        router.push(`/chat/${activeConversationId}`);
      } else {
        // Active conversation was deleted, clear it and redirect to home
        isRedirectingRef.current = true;
        clearProState();
        dispatch(setActiveConversation(null));
        router.push('/');
        setTimeout(() => {
          isRedirectingRef.current = false;
          lastProcessedChatIdRef.current = null;
        }, 100);
      }
    }
  }, [chatIdFromUrl, conversations, dispatch, activeConversationId, router, conversationsLoading, conversationsFetched, pathname, fetchConversationById, isStreaming]);

  // Close right panel when navigating away from chat page
  useEffect(() => {
    // Check if we're on a chat page (/chat, /chat/session_id, or home /)
    const isOnChatPage = pathname?.startsWith('/chat/') || pathname === '/chat' || pathname === '/';

    // If right panel is open and we're not on a chat page, close it
    if (rightPanelOpen && !isOnChatPage) {
      dispatch(setRightPanelOpen(false));
    }
  }, [pathname, rightPanelOpen, dispatch]);

  // Check if chat is initialized (has messages, not in welcome screen)
  const hasMessages = activeConversation?.messages && activeConversation.messages.length > 0;

  // Sidebar is now closed by default - user can toggle it manually
  // Removed auto-open on desktop to keep sidebar closed by default

  const handleToggleRightPanel = () => {
    dispatch(toggleRightPanel());
  };

  return (
    <div className="relative h-screen overflow-hidden bg-gray-50">
      {/* Skip to main content link */}
      <a href="#chat-container" className="skip-link">
        Skip to main content
      </a>

      {/* Fixed PanelRightDashed Icon - Top Right Corner */}
      {/* Show icon when panel is closed AND chat is initialized (has messages, not in welcome screen) */}
      {!rightPanelOpen && hasMessages && (
        <button
          onClick={handleToggleRightPanel}
          className="fixed top-4 right-4 md:right-8 lg:right-4 z-50 p-0 transition-all duration-300 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
          title="Toggle Right Panel"
          aria-label="Toggle Right Panel"
        >
          <PanelRightDashed
            className="h-6 w-6"
            style={{ color: cssVar(CSS_VARS.gray600) }}
          />
        </button>
      )}

      {/* Main Content - Full width, not affected by sidebar */}
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* Mobile Header - Only show when sidebar is closed on mobile (< 768px) */}
        {!sidebarOpen && (
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden z-30">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(setSidebarOpen(true))}
              className="h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Image src="/Qiddiya-logo.png" alt="Logo" width={52} height={32} />
            </div>
            <div className="h-9 w-9"></div>
          </div>
        )}

        {/* Chat Container, Chat Listing Page, Pinned Page, Groups Page, Group Detail Page, or Settings Page */}
        {pathname === '/chats' ? (
          <ChatListingPage />
        ) : pathname === '/pinned' ? (
          <PinnedListingPage />
        ) : pathname === '/groups' ? (
          <GroupListingPage />
        ) : pathname?.startsWith('/groups/') ? (
          <GroupDetailPage />
        ) : pathname === '/settings' ? (
          <SettingsPage />
        ) : (
          <ChatContainer />
        )}
      </div>

      {/* Sidebar - Overlay on top of main content */}
      <Sidebar />

      {/* Right Panel */}
      <RightPanel />

      {/* Overlay when right panel overlays chat (below xl); docked mode on xl+ has no dimmer */}
      {rightPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 xl:hidden"
          onClick={() => dispatch(toggleRightPanel())}
          aria-hidden="true"
        />
      )}

      {/* Notification Container */}
      <NotificationContainer />
    </div>
  );
}

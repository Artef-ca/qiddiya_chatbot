'use client';

import Image from 'next/image';
import { useState } from 'react';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveConversation } from '@/store/slices/chatSlice';
import { clearProState } from '@/lib/chatProState';
import { toggleSidebar, setSidebarOpen, setRightPanelOpen } from '@/store/slices/uiSlice';
import SidebarToggle from '@/components/ui/sidebar-toggle';
import ConversationList from '@/components/sidebar/ConversationList';
import NavigationItem from '@/components/sidebar/NavigationItem';
import { useIsMobile } from '@/hooks/useResponsive';
import { useConversations } from '@/hooks/useConversations';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  Pin,
  Bell,
  Star,
  Clock,
  MessageSquareText,
  MessageSquarePlus,
  Layers,
  User,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeColors } from '@/lib/utils/theme';

type ActiveTab = 'new-chat' | 'chats' | 'groups' | 'pinned' | 'boards' | 'alerts' | 'settings';

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { conversations, replacedConversationIds } = useAppSelector((state) => state.chat);
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<ActiveTab>('new-chat');
  const { user } = useUserProfile();
  const [avatarError, setAvatarError] = useState(false);
  
  // Reset avatar error when user changes
  React.useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);
  
  // Fetch conversations from API
  const { conversations: apiConversations } = useConversations();

  // Derive activeTab from pathname
  const derivedActiveTab: ActiveTab = React.useMemo(() => {
    if (pathname === '/chats') return 'chats';
    if (pathname === '/groups' || pathname?.startsWith('/groups/')) return 'groups';
    if (pathname === '/pinned') return 'pinned';
    if (pathname === '/settings') return 'settings';
    if (pathname === '/') return 'new-chat';
    return activeTab; // Fallback to state if pathname doesn't match
  }, [pathname, activeTab]);

  const handleNewChat = () => {
    setActiveTab('new-chat');
    clearProState(); // Reset Pro toggle when starting new chat
    // Ensure right panel is closed when returning to welcome screen
    dispatch(setRightPanelOpen(false));
    // Clear active conversation first
    dispatch(setActiveConversation(null));
    // Navigate to home page
    // If already on home, we don't need to navigate since we've already cleared the conversation
    // The MainLayout useEffect will handle clearing the active conversation
    if (pathname !== '/') {
      router.push('/');
    }
    if (isMobile) {
      dispatch(setSidebarOpen(false));
    }
  };

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (isMobile) {
      dispatch(setSidebarOpen(false));
    }
  };

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  const mergedConversations = React.useMemo(() => {
    const conversationMap = new Map<string, typeof conversations[0]>();

    apiConversations.forEach(conv => {
      conversationMap.set(conv.id, conv);
    });

    conversations.forEach(conv => {
      conversationMap.set(conv.id, conv);
    });

    const list = Array.from(conversationMap.values());
    return replacedConversationIds.length > 0
      ? list.filter(conv => !replacedConversationIds.includes(conv.id))
      : list;
  }, [apiConversations, conversations, replacedConversationIds]);
  
  // Get starred and recent conversations
  const starredConversations = mergedConversations.filter(conv => conv.starred);
  const allRecentConversations = mergedConversations
    .filter(conv => !conv.starred)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const recentConversations = allRecentConversations.slice(0, 10);

  return (
    <aside
      className={cn(
        'fixed z-50 flex flex-col transition-all duration-300 ease-in-out shadow-lg rounded-lg overflow-hidden group/sidebar p-1',
        // Mobile (< 768px): hide completely when closed, full height overlay
        sidebarOpen ? 'translate-x-0 w-72 left-0 top-0 bottom-0 h-screen' : '-translate-x-full w-72 left-0 top-0 bottom-0 h-screen',
        // Tablet (768px - 1023px) and Desktop (>= 1024px): overlay with 24px spacing from left, top, and bottom
        'md:translate-x-0 md:left-6 md:top-6 md:max-h-[calc(100vh-48px)]',
        sidebarOpen ? 'md:w-72' : 'md:w-[68px]'
      )}
      style={{
        backgroundColor: sidebarOpen ? themeColors.background() : 'rgba(255, 255, 255, 0.7)',
      }}
      data-sidebar-open={sidebarOpen}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo Section with Toggle */}
      <div className={cn(
        'flex items-center transition-all duration-300 py-6 px-4 relative',
        sidebarOpen ? 'justify-between' : 'flex-col justify-start gap-3'
      )}>
        {/* Logo - Always visible */}
        <div 
          className={cn(
            'flex items-center relative',
            sidebarOpen ? 'gap-2' : 'justify-center'
          )}
        >
          {/* Logo */}
          <div 
            className={cn(
              "relative flex items-center justify-center rounded-lg shrink-0 transition-opacity duration-200",
              !sidebarOpen && "group-hover/sidebar:opacity-0"
            )}
            style={{
              width: '32.118px',
              height: '30px',
              flexShrink: 0,
              aspectRatio: '32.12/30.00'
            }}
          >
            <Image 
              src="/QAIC-Logo.png" 
              alt="Logo" 
              width={32.118} 
              height={30} 
              className="w-full h-full object-contain"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
          {/* Expand icon - visible on sidebar hover when collapsed */}
          {!sidebarOpen && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="pointer-events-auto">
                <SidebarToggle
                  isOpen={sidebarOpen}
                  onClick={handleToggleSidebar}
                />
              </div>
            </div>
          )}
        </div>
        {/* Sidebar Toggle - Only visible when sidebar is open */}
        {sidebarOpen && (
          <SidebarToggle
            isOpen={sidebarOpen}
            onClick={handleToggleSidebar}
          />
        )}
      </div>

      {/* Navigation */}
      <div className={cn(
        'transition-all duration-300 p-2 pt-0'
      )}>
        <nav className={cn('flex flex-col', !sidebarOpen && 'items-center')} style={{ gap: '4px' }}>
          <NavigationItem
            icon={MessageSquarePlus}
            label="New Chat"
            sidebarOpen={sidebarOpen}
            onClick={handleNewChat}
            usePrimaryColor={true}
            isActive={derivedActiveTab === 'new-chat'}
          />
          <NavigationItem
            icon={MessageSquareText}
            label="Chats"
            sidebarOpen={sidebarOpen}
            onClick={() => {
              handleTabClick('chats');
              router.push('/chats');
              if (isMobile) {
                dispatch(setSidebarOpen(false));
              }
            }}
            isActive={derivedActiveTab === 'chats'}
          />
          <NavigationItem
            icon={Layers}
            label="Groups"
            sidebarOpen={sidebarOpen}
            onClick={() => {
              handleTabClick('groups');
              router.push('/groups');
              if (isMobile) {
                dispatch(setSidebarOpen(false));
              }
            }}
            isActive={derivedActiveTab === 'groups'}
          />
          <NavigationItem
            icon={Pin}
            label="Pinned"
            sidebarOpen={sidebarOpen}
            onClick={() => {
              handleTabClick('pinned');
              router.push('/pinned');
              if (isMobile) {
                dispatch(setSidebarOpen(false));
              }
            }}
            isActive={derivedActiveTab === 'pinned'}
          />
          {/* Board tab hidden for now */}
          {/* <NavigationItem
            icon={LayoutDashboard}
            label="Boards"
            sidebarOpen={sidebarOpen}
            onClick={() => handleTabClick('boards')}
            isActive={activeTab === 'boards'}
          /> */}
        </nav>
      </div>

      {/* Scrollable Content - Hide when collapsed */}
      {sidebarOpen && (
        <div 
          className="custom-scrollbar flex-1 overflow-y-auto min-h-0"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties & { msOverflowStyle?: string }}
        >
          {/* Starred Section */}
          <ConversationList
            conversations={starredConversations}
            title="Starred"
            icon={Star}
            iconClassName="fill-[var(--color-accent-yellow-500)]"
            iconStyle={{ color: themeColors.accentYellow500() }}
            isFirstSection={true}
          />

          {/* Recent Section */}
          <ConversationList
            conversations={recentConversations}
            allConversations={allRecentConversations}
            title="Recent"
            icon={Clock}
            iconClassName="text-gray-400"
            showViewAll={allRecentConversations.length > 10}
            isFirstSection={false}
          />

          {/* Empty State */}
          {/* {conversations.length === 0 && (
            <div className="flex h-full items-center justify-center p-4 overflow-hidden">
              <p className="text-center text-sm text-gray-500">
                No conversations yet. Start a new chat to begin!
              </p>
            </div>
          )} */}
        </div>
      )}

      {/* Bottom Section - Always visible at bottom */}
      <div className={cn(
        'transition-all duration-300 mt-auto p-2  '
      )}>
        <nav className={cn('flex flex-col', !sidebarOpen && 'items-center')} style={{ gap: '4px' }}>
    
        <NavigationItem
          icon={Bell}
          label="Alerts / Notifications"
          sidebarOpen={sidebarOpen}
          onClick={() => handleTabClick('alerts')}
          isActive={activeTab === 'alerts'}
          disabled={true}
        />
        </nav>
        <div 
          className={cn(
            'flex items-center',
            sidebarOpen ? 'w-full gap-2 justify-start' : 'w-10 h-10 justify-center p-0 mx-auto'
          )}
          style={{ padding: '4px', marginBottom: '16px' }}
        >
          <div 
            className="flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              width: '32px',
              height: '32px',
              flexShrink: 0,
              aspectRatio: '1/1',
              borderRadius: '200px',
              border: `0.75px solid ${themeColors.gray300()}`,
              background: `var(--avatar-user-square-stefan-sears-color-background, url(<path-to-image>) lightgray 50% / cover no-repeat, ${themeColors.neutral300()})`
            }}
          >
            {user?.avatar && !avatarError ? (
              <Image
                src={user.avatar}
                alt={user.fullName || user.name || 'User'}
                width={32}
                height={32}
                className="rounded-full object-cover"
                style={{
                  width: '100%',
                  height: '100%',
                }}
                onError={() => {
                  // Fallback to icon if image fails to load
                  setAvatarError(true);
                }}
                unoptimized={user.avatar.startsWith('data:')} // Allow data URLs
              />
            ) : (
              <User className="h-5 w-5" style={{ color: themeColors.gray400() }} />
            )}
          </div>
          {sidebarOpen && (
            <>
              <div 
                className="flex-1 text-left"
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1,
                  overflow: 'hidden',
                  color: themeColors.neutral950(),
                  textOverflow: 'ellipsis',
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '16px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  opacity: 0.8,
                  textAlign: 'left'
                }}
              >
                {user?.fullName || user?.name || 'User'}
              </div>
              <button
                onClick={() => {
                  handleTabClick('settings');
                  router.push('/settings');
                  if (isMobile) {
                    dispatch(setSidebarOpen(false));
                  }
                }}
                className="shrink-0 p-1 rounded hover:bg-gray-100 transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
                title="Settings"
                aria-label="Settings"
              >
                <Settings 
                  className="h-4 w-4" 
                  style={{ 
                    color: pathname === '/settings' ? themeColors.secondary600() : themeColors.gray400()
                  }} 
                />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

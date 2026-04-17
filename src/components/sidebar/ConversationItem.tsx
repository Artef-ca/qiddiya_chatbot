'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  updateConversationTitle,
  toggleStarConversation,
} from '@/store/slices/chatSlice';
import { clearProState } from '@/lib/chatProState';
import { setSidebarOpen } from '@/store/slices/uiSlice';
import { useConversations } from '@/hooks/useConversations';
import { addToast } from '@/store/slices/uiSlice';
import { Star, Ellipsis, Trash2, PencilLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeColors } from '@/lib/utils/theme';
import { useIsMobile } from '@/hooks/useResponsive';
import type { Conversation } from '@/types';
import PressHoverItem from '@/components/ui/PressHoverItem';
import DeleteChatModal from '@/components/chats/DeleteChatModal';

interface ConversationItemProps {
  conversation: Conversation;
  index?: number;
  totalCount?: number;
}

const CONVERSATION_TITLE_STYLE: React.CSSProperties = {
  overflow: 'hidden',
  color: themeColors.gray900(),
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: 'Manrope, var(--font-manrope)',
  fontSize: '13px',
  fontWeight: 500,
  lineHeight: '24px',
  letterSpacing: '0.09px',
};

export default function ConversationItem({ conversation, index, totalCount }: ConversationItemProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { activeConversationId } = useAppSelector((state) => state.chat);
  const isMobile = useIsMobile();
  const { updateConversationAsync, preloadConversation } = useConversations();
  
  const [openMenu, setOpenMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = activeConversationId === conversation.id;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenu(false);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenu]);

  // Focus input when editing
  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editing]);

  // Preload conversation on hover (ChatGPT-style optimization)
  const handleMouseEnter = () => {
    if (!editing && !isActive) {
      // Preload conversation events in background so click is instant
      preloadConversation(conversation.id);
    }
  };

  const handleSelect = () => {
    if (!editing) {
      // Always show conversation id in URL (conv-<number> for mock, session_id for API)
      router.push(`/chat/${conversation.id}`);
      if (isMobile) {
        dispatch(setSidebarOpen(false));
      }
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(!openMenu);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
    setOpenMenu(false);
  };

  const handleDeleteComplete = () => {
    // Check if the deleted conversation is the active one
    const isActiveConversation = activeConversationId === conversation.id;
    
    // If deleting the active conversation, redirect to welcome screen
    if (isActiveConversation) {
      clearProState();
      router.push('/');
    }
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setEditValue(conversation.title);
    setOpenMenu(false);
  };

  const handleRenameSubmit = async () => {
    const trimmedValue = editValue.trim();
    
    // Validate input
    if (!trimmedValue) {
      dispatch(addToast({
        type: 'error',
        message: 'Chat name cannot be empty',
      }));
      return;
    }

    // If name hasn't changed, just close
    if (trimmedValue === conversation.title) {
      setEditing(false);
      setEditValue(conversation.title);
      return;
    }

    try {
      // Update conversation via API
      await updateConversationAsync({ 
        id: conversation.id, 
        updates: { title: trimmedValue } 
      });

      // Update Redux store
      dispatch(updateConversationTitle({ 
        id: conversation.id, 
        title: trimmedValue 
      }));

      // Show success notification
      dispatch(addToast({
        type: 'success',
        message: 'Chat was successfully renamed',
      }));

      setEditing(false);
      setEditValue(trimmedValue);
    } catch {
      // Show error notification
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to rename the selected Chat. Please try again later.',
      }));
    }
  };

  const handleRenameCancel = () => {
    setEditing(false);
    setEditValue(conversation.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStarredValue = !(conversation.starred ?? false);
    const conversationTitle = conversation.title;
    
    // Optimistically update the UI
    dispatch(toggleStarConversation(conversation.id));
    setOpenMenu(false);
    
    try {
      // Update conversation via API
      await updateConversationAsync({ 
        id: conversation.id, 
        updates: { starred: newStarredValue } 
      });

      // Show success notification
      dispatch(addToast({
        type: 'success',
        message: newStarredValue 
          ? `${conversationTitle} was successfully starred`
          : `${conversationTitle} was successfully unstarred`,
      }));
    } catch {
      // Revert the optimistic update on error
      dispatch(toggleStarConversation(conversation.id));
      
      // Show error notification
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to star the selected chat. Please try again later.',
      }));
    }
  };

  if (editing) {
    return (
      <div className="group relative flex items-center" ref={menuRef}>
        <input
          ref={editInputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex w-full items-start gap-2 rounded-sm px-2 py-0.5 text-left text-sm bg-white border focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
          style={{ 
            borderColor: themeColors.primary300()
          }}
        />
      </div>
    );
  }

  if (openMenu) {
    return (
      <div 
        className="relative flex w-full items-center gap-2 rounded-lg px-2 py-0.5 text-left text-sm bg-gray-50"
        onClick={(e) => {
          if ((e.target as Element).closest('button')) {
            return;
          }
          setOpenMenu(false);
        }}
        onMouseLeave={() => setOpenMenu(false)}
        ref={menuRef}
      >
        <span 
          className="flex-1 min-w-0 pr-2"
          style={CONVERSATION_TITLE_STYLE}
        >
          {conversation.title}
        </span>
        {/* Gradient fade overlay before menu buttons */}
        <div
          className="absolute right-20 top-0 bottom-0 w-12 pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent, ${themeColors.gray50()})`,
          }}
        />
        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <button
            onClick={handleDelete}
            className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
            title="Delete"
            aria-label={`Delete conversation: ${conversation.title}`}
          >
            <Trash2 
              className="h-4 w-4" 
              style={{ color: themeColors.error() }} 
            />
          </button>
          <button
            onClick={handleRename}
            className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
            title="Rename"
            aria-label={`Rename this conversation: ${conversation.title}`}
          >
            <PencilLine
              className="h-4 w-4" 
              style={{ color: themeColors.gray600() }} 
            />
          </button>
          <button
            onClick={handleStar}
            className="p-1 rounded focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2"
            title={conversation.starred ? "Unstar" : "Star"}
            aria-label={conversation.starred ? `Unstar this conversation: ${conversation.title}` : `Star this conversation: ${conversation.title}`}
          >
            <Star 
              className="h-4 w-4"
              fill={conversation.starred ? 'currentColor' : 'none'}
              style={{ 
                color: conversation.starred ? '#0093D4' : themeColors.gray700()
              }} 
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group relative flex items-center" 
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => {
        if (openMenu) {
          setOpenMenu(false);
        }
      }}
    >
      <PressHoverItem className="w-full">
        <button
          onClick={handleSelect}
          className={cn(
            'relative flex w-full items-center rounded-sm px-2 py-0.5 text-left text-sm transition-colors hover:bg-gray-100',
            'focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2'
          )}
          style={isActive ? { 
            backgroundColor: themeColors.primary50() 
          } : undefined}
          aria-label={`Conversation: ${conversation.title}`}
          aria-current={isActive ? 'true' : 'false'}
          aria-posinset={index !== undefined ? index + 1 : undefined}
          aria-setsize={totalCount}
          role="listitem"
        >
        <span 
          className="flex-1 min-w-0 relative pr-4"
          style={CONVERSATION_TITLE_STYLE}
        >
          {conversation.title}
          {/* Gradient fade overlay - fades text before menu */}
          <span
            className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{
              background: isActive 
                ? `linear-gradient(to right, transparent 0%, ${themeColors.primary50()} 100%)`
                : `linear-gradient(to right, transparent 0%, ${themeColors.background()} 100%)`,
            }}
          />
          <span
            className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: `linear-gradient(to right, transparent 0%, ${themeColors.gray100()} 100%)`,
            }}
          />
        </span>
        <div
          onClick={handleMenuToggle}
          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 rounded cursor-pointer z-10"
          style={{
            width: '24px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setOpenMenu(!openMenu);
            }
          }}
        >
          <Ellipsis 
            className="h-4 w-4" 
            style={{ color: themeColors.gray600() }} 
          />
        </div>
        </button>
      </PressHoverItem>

      {/* Delete Chat Modal */}
      <DeleteChatModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        conversationsToDelete={[conversation]}
        onDeleteComplete={handleDeleteComplete}
      />
    </div>
  );
}


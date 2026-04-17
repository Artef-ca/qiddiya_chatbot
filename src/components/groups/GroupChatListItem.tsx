'use client';

import { useState, useRef } from 'react';
import { 
  Pin, 
  MoreVertical, 
  PencilLine, 
  Star, 
  Share2, 
  Trash2,
  Check,
  DiamondMinus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeColors } from '@/lib/utils/theme';
import { formatTimeAgo } from '@/lib/utils/date';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleStarConversation } from '@/store/slices/chatSlice';
import { addToast } from '@/store/slices/uiSlice';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import { useClickOutside } from '@/hooks/useClickOutside';
import DeleteChatModal from '../chats/DeleteChatModal';
import RenameChatModal from '../chats/RenameChatModal';
import AddToGroupModal from '../chats/AddToGroupModal';
import ShareExportModal from '../chats/ShareExportModal';
import type { Conversation } from '@/types';

interface GroupChatListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onClick?: () => void;
  onPinClick?: () => void;
  groupId: string;
  isPinFilterActive?: boolean; // Whether this chat's pin icon is active (clicked to filter)
}

interface GroupOption {
  id: string;
  name: string;
  conversationIds: string[];
}

function isGroupOption(value: unknown): value is GroupOption {
  if (!value || typeof value !== 'object') return false;
  const maybeGroup = value as Record<string, unknown>;
  return (
    typeof maybeGroup.id === 'string' &&
    typeof maybeGroup.name === 'string' &&
    Array.isArray(maybeGroup.conversationIds)
  );
}

const MENU_ITEM_STYLE = {
  fontFamily: 'Manrope, var(--font-manrope)',
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '20px',
};

export default function GroupChatListItem({
  conversation,
  isSelected,
  onSelect,
  onClick,
  onPinClick,
  groupId,
  isPinFilterActive = false,
}: GroupChatListItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddToGroupModalOpen, setIsAddToGroupModalOpen] = useState(false);
  const [isShareExportModalOpen, setIsShareExportModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dispatch = useAppDispatch();
  const { updateConversationAsync, groups: allGroups } = useConversations();
  const safeGroups: GroupOption[] = (Array.isArray(allGroups) ? (allGroups as unknown[]) : []).filter(isGroupOption);
  const { removeConversationsFromGroup } = useGroups();
  
  // Get pinned items from Redux store
  const pinnedItems = useAppSelector((state) => state.pinned.items);
  
  // Get conversation from Redux store to get the latest starred state
  const reduxConversation = useAppSelector((state) => 
    state.chat.conversations.find(conv => conv.id === conversation.id)
  );
  
  // Count pinned items for this conversation
  const pinCount = pinnedItems.filter(item => item.conversationId === conversation.id).length;
  
  // Check if conversation is starred - prefer Redux state for immediate updates
  const isStarred = reduxConversation?.starred ?? conversation.starred ?? false;
  
  // Close menu on outside click
  useClickOutside([menuRef, buttonRef], () => {
    setIsMenuOpen(false);
  });
  
  const timeAgo = conversation.updatedAt
    ? formatTimeAgo(conversation.updatedAt instanceof Date ? conversation.updatedAt : new Date(conversation.updatedAt))
    : '';
  
  const showMenuButton = isHovered && !isSelected;
  const showCheckbox = isHovered || isSelected;
  
  const handleStar = async () => {
    try {
      await updateConversationAsync({ 
        id: conversation.id, 
        updates: { starred: !isStarred } 
      });
      dispatch(toggleStarConversation(conversation.id));
      dispatch(addToast({ 
        type: 'success', 
        message: `Chat was successfully ${!isStarred ? 'starred' : 'unstarred'}` 
      }));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to update chat' }));
    }
    setIsMenuOpen(false);
  };
  
  const handleRemoveFromGroup = async () => {
    try {
      await removeConversationsFromGroup({ groupId, conversationIds: [conversation.id] });
      dispatch(addToast({ type: 'success', message: 'Chat was successfully removed from group' }));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to remove chat from group' }));
    }
    setIsMenuOpen(false);
  };
  
  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPinClick) {
      onPinClick();
    }
  };
  
  return (
    <div
      className="flex items-center relative"
      style={{
        gap: '16px',
        width: '100%',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsMenuOpen(false);
      }}
    >
      {/* Checkbox - Show on hover or when selected */}
      <div
        className={cn(
          'flex items-center justify-center transition-opacity',
          showCheckbox ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          width: '16px',
          height: '16px',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div
          className="flex items-center justify-center cursor-pointer"
          style={{
            width: '16px',
            height: '16px',
            border: isSelected
              ? `1px solid ${themeColors.primary600()}`
              : `1px solid ${themeColors.gray400()}`,
            background: isSelected
              ? themeColors.primary600()
              : 'rgba(255, 255, 255, 0.5)',
            borderRadius: '4px',
          }}
        >
          {isSelected && (
            <Check size={12} style={{ color: themeColors.backgroundSecondary() }} strokeWidth={3} />
          )}
        </div>
      </div>

      {/* Content Card */}
      <div
        className="flex flex-1 gap-2 items-center"
        style={{
          minWidth: 0,
        }}
      >
        <div
          className="flex flex-col flex-1 transition-all cursor-pointer"
          style={{
            padding: '12px 16px',
            gap: '4px',
            borderRadius: '8px',
            border: isSelected 
              ? `1px solid ${themeColors.gray200()}`
              : `1px solid ${themeColors.gray100()}`,
            background: isSelected
              ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)'
              : themeColors.gray50(),
            boxShadow: isSelected
              ? `0px 1px 4px 0px ${themeColors.gray100()}`
              : 'none',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
          onClick={onClick}
        >
          {/* Top Row: Title and Pin Count */}
          <div className="flex items-center w-full" style={{ gap: '32px' }}>
            <h3
              className="flex-1 truncate"
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '24px',
                color: themeColors.gray700(),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {conversation.title}
            </h3>
            {/* Pin Count - Always visible, clickable */}
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" 
              style={{ gap: '4px' }}
              onClick={handlePinClick}
            >
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '16px',
                  fontWeight: isPinFilterActive ? 600 : 500,
                  lineHeight: '24px',
                  color: isPinFilterActive ? themeColors.secondary600() : themeColors.gray600(),
                  textAlign: 'right',
                }}
              >
                {pinCount}
              </span>
              <div className="flex items-center" style={{ paddingTop: '2px' }}>
                <Pin
                  size={16}
                  style={{ color: isPinFilterActive ? themeColors.secondary600() : themeColors.gray600() }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Group name (hidden) and Time */}
          <div className="flex items-center justify-between w-full" style={{ color: themeColors.gray600() }}>
            <p
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                opacity: 0, // Hidden as per design
              }}
            >
              Budget & Finance
            </p>
            {/* Time */}
            {timeAgo && (
              <p
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '10px',
                  fontWeight: 600,
                  lineHeight: '16px',
                  letterSpacing: '0.18px',
                  color: themeColors.gray600(),
                  textAlign: 'right',
                }}
              >
                {timeAgo}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu Button - Show on hover */}
      <div
        className={cn(
          'flex items-start justify-center transition-opacity relative',
          showMenuButton ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          width: '24px',
          height: '24px',
        }}
      >
        <button
          ref={buttonRef}
          className="flex items-center justify-center rounded transition-colors hover:bg-gray-100 cursor-pointer"
          style={{
            padding: '4px',
            borderRadius: '4px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
        >
          <MoreVertical
            size={16}
                style={{ color: themeColors.gray700() }}
          />
        </button>
        
        {/* Context Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute z-50"
            style={{
              top: '28px',
              right: '0',
              minWidth: '200px',
              background: themeColors.background(),
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              padding: '4px 0',
              border: `1px solid ${themeColors.gray200()}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Rename */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setIsRenameModalOpen(true);
                setIsMenuOpen(false);
              }}
              style={{
                ...MENU_ITEM_STYLE,
                color: themeColors.gray700(),
              }}
            >
              <PencilLine size={16} style={{ color: themeColors.gray600() }} />
              <span>Rename</span>
            </button>
            
            {/* Star / Unstar */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={handleStar}
              style={{
                ...MENU_ITEM_STYLE,
                color: themeColors.gray700(),
              }}
            >
              {isStarred ? (
                <>
                  <Star size={16} fill="currentColor" style={{ color: '#0093D4' }} />
                  <span>Unstar</span>
                </>
              ) : (
                <>
                  <Star size={16} style={{ color: themeColors.gray600() }} />
                  <span>Star</span>
                </>
              )}
            </button>
            
            {/* Remove from Group */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={handleRemoveFromGroup}
              style={{
                ...MENU_ITEM_STYLE,
                color: themeColors.gray700(),
              }}
            >
              <DiamondMinus size={16} style={{ color: themeColors.gray600() }} />
              <span>Remove from Group</span>
            </button>
            
            {/* Share & Export */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setIsShareExportModalOpen(true);
                setIsMenuOpen(false);
              }}
              style={{
                ...MENU_ITEM_STYLE,
                color: themeColors.gray700(),
              }}
            >
              <Share2 size={16} style={{ color: themeColors.gray600() }} />
              <span>Share & Export</span>
            </button>
            
            {/* Delete */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setIsDeleteModalOpen(true);
                setIsMenuOpen(false);
              }}
              style={{
                ...MENU_ITEM_STYLE,
                color: themeColors.error(),
              }}
            >
              <Trash2 size={16} style={{ color: themeColors.error() }} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <RenameChatModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        conversation={conversation}
      />
      
      <DeleteChatModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        conversationsToDelete={[conversation]}
      />
      
      <AddToGroupModal
        isOpen={isAddToGroupModalOpen}
        onClose={() => setIsAddToGroupModalOpen(false)}
        conversations={[conversation]}
        groups={safeGroups}
      />
      
      <ShareExportModal
        isOpen={isShareExportModalOpen}
        onClose={() => setIsShareExportModalOpen(false)}
        chatId={conversation.id}
        chatTitle={conversation.title}
        conversationMessages={conversation.messages}
        exportOnly={true}
      />
    </div>
  );
}


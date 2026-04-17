'use client';

import { useState, useRef } from 'react';
import { 
  Pin, 
  MoreVertical, 
  PencilLine, 
  Star, 
  Share2, 
  Trash2,
  DiamondMinus
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { formatTimeAgo } from '@/lib/utils/date';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleStarConversation } from '@/store/slices/chatSlice';
import { addToast } from '@/store/slices/uiSlice';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import { useClickOutside } from '@/hooks/useClickOutside';
import DeleteChatModal from './DeleteChatModal';
import RenameChatModal from './RenameChatModal';
import AddToGroupModal from './AddToGroupModal';
import ShareExportModal from './ShareExportModal';
import { getConversationPreviewText } from '@/lib/utils/textExtraction';
import type { Conversation } from '@/types';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
}

function isGroup(value: unknown): value is Group {
  if (!value || typeof value !== 'object') return false;
  const maybeGroup = value as Record<string, unknown>;
  return (
    typeof maybeGroup.id === 'string' &&
    typeof maybeGroup.name === 'string' &&
    Array.isArray(maybeGroup.conversationIds)
  );
}

interface ChatListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onClick?: () => void;
  groups?: Group[];
}

const MENU_ITEM_STYLE = {
  fontFamily: 'Manrope, var(--font-manrope)',
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '20px',
};

export default function ChatListItem({
  conversation,
  isSelected,
  onSelect,
  onClick,
  groups = [],
}: ChatListItemProps) {
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
  const mergedGroups: Group[] = [...(Array.isArray(allGroups) ? allGroups : []), ...groups].filter(isGroup);

  const { removeConversationsFromGroup } = useGroups();
  
  // Get pinned items from Redux store
  const pinnedItems = useAppSelector((state) => state.pinned.items);

  const isInGroup = (() => {
    try {
      if (groups === undefined || groups === null) {
        return false;
      }
      if (!Array.isArray(groups)) {
        return false;
      }
      if (groups.length === 0) {
        return false;
      }

      for (const group of groups) {
        if (!group || typeof group !== 'object') {
          continue;
        }
        if (!group.conversationIds || !Array.isArray(group.conversationIds)) {
          continue;
        }
        if (group.conversationIds.length === 0) {
          continue;
        }
        if (group.conversationIds.includes(conversation.id)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  })();
  
  // Check if conversation is starred (handle undefined/null)
  const isStarred = conversation.starred ?? false;
  
  // Close menu on outside click
  useClickOutside(menuRef, () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  });
  
  // Count pinned items for this conversation
  const pinCount = pinnedItems.filter(
    (item) => item.conversationId === conversation.id
  ).length;
  
  // Get preview from last message with extractable content (tries multiple messages if last has none)
  const description = getConversationPreviewText(conversation, 50);
  const timeAgo = conversation.updatedAt
    ? formatTimeAgo(conversation.updatedAt)
    : '';

  // Show checkbox if selected or hovered
  const showCheckbox = isSelected || isHovered;
  // Show menu button if hovered
  const showMenuButton = isHovered;
  
  // Handle menu actions
  const handleRename = () => {
    setIsRenameModalOpen(true);
    setIsMenuOpen(false);
  };
  
  const handleStar = async () => {
    const newStarredValue = !isStarred;
    const conversationTitle = conversation.title;
    
    // Optimistically update the UI
    dispatch(toggleStarConversation(conversation.id));
    setIsMenuOpen(false);
    
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
  
  const handleAddToGroup = () => {
    setIsAddToGroupModalOpen(true);
    setIsMenuOpen(false);
  };
  
  const handleRemoveFromGroup = async () => {
    setIsMenuOpen(false);
    
    // Find all groups that contain this conversation
    const conversationId = conversation.id;
    const groupsWithChat = mergedGroups.filter(g => 
      g.conversationIds && g.conversationIds.includes(conversationId)
    );
    
    if (groupsWithChat.length === 0) {
      // Chat is not in any group
      dispatch(addToast({
        type: 'error',
        message: 'This chat is not in any group.',
      }));
      return;
    }
    
    // Remove from all groups
    try {
      for (const group of groupsWithChat) {
        await removeConversationsFromGroup({
          groupId: group.id,
          conversationIds: [conversationId],
        });
      }
      
      // Show success notification
      const groupCount = groupsWithChat.length;
      const groupText = groupCount === 1 ? 'group' : 'groups';
      dispatch(addToast({
        type: 'success',
        message: `**${conversation.title}** was successfully removed from ${groupText}`,
      }));
    } catch {
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to remove the chat from groups. Please try again later.',
      }));
    }
  };
  
  const handleShareExport = () => {
    setIsShareExportModalOpen(true);
    setIsMenuOpen(false);
  };
  
  const handleDelete = () => {
    setIsDeleteModalOpen(true);
    setIsMenuOpen(false);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 transition-colors',
        'hover:opacity-90'
      )}
      style={{
        height: '76px',
        gap: '16px',
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
          'flex items-center justify-center transition-opacity cursor-pointer',
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
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            border: `1px solid ${isSelected ? cssVar(CSS_VARS.primary500) : cssVar(CSS_VARS.gray400)}`,
            background: isSelected ? cssVar(CSS_VARS.primary500) : 'rgba(255, 255, 255, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSelected && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke={cssVar(CSS_VARS.gray50)}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content Card */}
      <div
        className="flex flex-col transition-all cursor-pointer"
        style={{
          display: 'flex',
          width: '790px',
          minWidth: '790px',
          padding: '12px 16px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '4px',
          borderRadius: '8px',
          border: isSelected 
            ? '1px solid #DCD4FF' // Electric-Violet-200
            : '1px solid #ECEEF2', // Lynch-100
          background: isSelected
            ? 'linear-gradient(0deg, rgba(245, 242, 255, 0.20) 0%, rgba(245, 242, 255, 0.20) 100%), #F6F7F9' // Lynch-50
            : '#F6F7F9', // Lynch-50
          boxShadow: isSelected
            ? '0 1px 4px 0 #ECEEF2' // Lynch-100
            : 'none',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
        onClick={onClick}
      >
        {/* Top Row: Title and Pin Count */}
        <div className="flex items-center justify-between w-full">
          <h3
            className="flex-1 truncate"
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '24px',
              color: cssVar(CSS_VARS.gray700),
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {conversation.title}
          </h3>
          {/* Pin Count - Always visible, opposite of Name */}
          <div className="flex items-center" style={{ gap: '4px', marginLeft: '16px' }}>
            <span
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: '24px',
                color: cssVar(CSS_VARS.gray600),
                textAlign: 'right',
              }}
            >
              {pinCount}
            </span>
            <div className="flex items-center" style={{ paddingTop: '2px' }}>
              <Pin
                size={16}
                style={{ color: cssVar(CSS_VARS.gray600) }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Row: Description and Time */}
        <div className="flex items-center justify-between w-full">
          <p
            className="flex-1 truncate"
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: '24px',
              letterSpacing: '0.09px',
              color: cssVar(CSS_VARS.gray600),
            }}
          >
            {description}
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
                color: cssVar(CSS_VARS.gray600),
                textAlign: 'right',
                marginLeft: '16px',
              }}
            >
              {timeAgo}
            </p>
          )}
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
            style={{ color: cssVar(CSS_VARS.gray700) }}
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
              background: '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              padding: '4px 0',
              border: `1px solid ${cssVar(CSS_VARS.gray200)}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Rename */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={handleRename}
              style={{
                ...MENU_ITEM_STYLE,
                color: cssVar(CSS_VARS.gray700),
              }}
            >
              <PencilLine size={16} style={{ color: cssVar(CSS_VARS.gray600) }} />
              <span>Rename</span>
            </button>
            
            {/* Star / Unstar */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={handleStar}
              style={{
                ...MENU_ITEM_STYLE,
                color: cssVar(CSS_VARS.gray700),
              }}
            >
              {isStarred ? (
                <>
                  <Star size={16} fill="currentColor" style={{ color: '#0093D4' }} />
                  <span>Unstar</span>
                </>
              ) : (
                <>
                  <Star size={16} style={{ color: cssVar(CSS_VARS.gray600) }} />
                  <span>Star</span>
                </>
              )}
            </button>
            
            {/* Add to Group / Remove from Group */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={isInGroup ? handleRemoveFromGroup : handleAddToGroup}
              style={{
                ...MENU_ITEM_STYLE,
                color: cssVar(CSS_VARS.gray700),
              }}
            >
              {/* Always show "Add to Group" if not explicitly in a group */}
              {isInGroup === true ? (
                <>
                  <DiamondMinus size={16} style={{ color: cssVar(CSS_VARS.gray600) }} />
                  <span>Remove from Group</span>
                </>
              ) : (
                <>
                  <Image 
                    src="/AddToGroup.svg" 
                    alt="Add to Group" 
                    width={16} 
                    height={16}
                  />
                  <span>Add to Group</span>
                </>
              )}
            </button>
            
            {/* Share & Export */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={handleShareExport}
              style={{
                ...MENU_ITEM_STYLE,
                color: cssVar(CSS_VARS.gray700),
              }}
            >
              <Share2 size={16} style={{ color: cssVar(CSS_VARS.gray600) }} />
              <span>Share & Export</span>
            </button>
            
            {/* Separator */}
            <div style={{ height: '1px', background: cssVar(CSS_VARS.gray200), margin: '4px 0' }} />
            
            {/* Delete */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={handleDelete}
              style={{
                ...MENU_ITEM_STYLE,
                color: '#EF4444', // Orange-red color for delete
              }}
            >
              <Trash2 size={16} style={{ color: '#EF4444' }} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Chat Modal */}
      <DeleteChatModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setIsHovered(false);
          setIsMenuOpen(false);
        }}
        conversationsToDelete={[conversation]}
      />

      {/* Rename Chat Modal */}
      <RenameChatModal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setIsHovered(false);
          setIsMenuOpen(false);
        }}
        conversation={conversation}
      />

      {/* Add to Group Modal */}
      <AddToGroupModal
        isOpen={isAddToGroupModalOpen}
        onClose={() => {
          setIsAddToGroupModalOpen(false);
          setIsHovered(false);
          setIsMenuOpen(false);
        }}
        conversations={[conversation]}
        groups={mergedGroups}
      />

      {/* Share & Export Modal */}
      <ShareExportModal
        isOpen={isShareExportModalOpen}
        onClose={() => setIsShareExportModalOpen(false)}
        chatId={conversation.id}
        chatTitle={conversation.title}
        exportOnly={true}
      />
    </div>
  );
}


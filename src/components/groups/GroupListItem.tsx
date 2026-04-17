'use client';

import { useState, useRef } from 'react';
import { 
  MoreVertical, 
  PencilLine, 
  Star, 
  Archive, 
  ArchiveX,
  Trash2,
  MessageSquareText,
  Pin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { formatTimeAgo } from '@/lib/utils/date';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useGroups } from '@/hooks/useGroups';
import { addToast } from '@/store/slices/uiSlice';
import RenameGroupModal from './RenameGroupModal';
import DeleteGroupModal from './DeleteGroupModal';
import type { Conversation } from '@/types';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
  starred?: boolean;
  archived?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface GroupListItemProps {
  group: Group;
  isSelected: boolean;
  onSelect: () => void;
  onClick?: () => void;
  conversations?: Conversation[];
}

export default function GroupListItem({
  group,
  isSelected,
  onSelect,
  onClick,
  conversations = [],
}: GroupListItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dispatch = useAppDispatch();
  const { updateGroup } = useGroups();
  
  // Get pinned items from Redux store
  const pinnedItems = useAppSelector((state) => state.pinned.items);
  
  // Check if group is starred or archived
  const isStarred = group.starred ?? false;
  const isArchived = group.archived ?? false;

  // Get conversations that belong to this group
  const groupConversations = conversations.filter(conv => 
    group.conversationIds.includes(conv.id)
  );

  // Count only existing chats in group (ignores stale deleted conversation IDs)
  const chatsCount = groupConversations.length;

  // Build a set of valid conversation IDs present in this group
  const validGroupConversationIds = new Set(groupConversations.map((conv) => conv.id));

  // Count pinned items only for existing conversations in this group
  const pinsCount = pinnedItems.filter(
    (item) => validGroupConversationIds.has(item.conversationId)
  ).length;

  // Get the most recent updatedAt from group conversations
  const mostRecentConversationUpdate = groupConversations.length > 0
    ? groupConversations.reduce((latest, conv) => {
        const convDate = conv.updatedAt instanceof Date 
          ? conv.updatedAt 
          : new Date(conv.updatedAt);
        const latestDate = latest instanceof Date 
          ? latest 
          : new Date(latest);
        return convDate > latestDate ? convDate : latestDate;
      }, groupConversations[0].updatedAt)
    : null;

  // Get group's own updatedAt
  const groupUpdatedAt = group.updatedAt 
    ? (group.updatedAt instanceof Date ? group.updatedAt : new Date(group.updatedAt))
    : null;

  // Use the most recent date between group's updatedAt and conversations' updatedAt
  const mostRecentUpdate = (() => {
    if (!groupUpdatedAt && !mostRecentConversationUpdate) return null;
    if (!groupUpdatedAt) return mostRecentConversationUpdate;
    if (!mostRecentConversationUpdate) return groupUpdatedAt;
    return groupUpdatedAt > mostRecentConversationUpdate ? groupUpdatedAt : mostRecentConversationUpdate;
  })();

  const timeAgo = mostRecentUpdate
    ? formatTimeAgo(mostRecentUpdate)
    : '';

  // Close menu on outside click
  useClickOutside(menuRef, () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  });

  // Show checkbox if selected or hovered
  const showCheckbox = isSelected || isHovered;
  // Show menu button if hovered
  const showMenuButton = isHovered;

  const handleRename = () => {
    setIsRenameModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleStar = async () => {
    const newStarredValue = !isStarred;
    setIsMenuOpen(false);
    
    try {
      await updateGroup({ 
        groupId: group.id, 
        updates: { starred: newStarredValue } 
      });

      dispatch(addToast({
        type: 'success',
        message: newStarredValue 
          ? `${group.name} was successfully starred`
          : `${group.name} was successfully unstarred`,
      }));
    } catch {
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to update the group. Please try again later.',
      }));
    }
  };

  const handleArchive = async () => {
    const newArchivedValue = !isArchived;
    setIsMenuOpen(false);
    
    try {
      await updateGroup({ 
        groupId: group.id, 
        updates: { archived: newArchivedValue } 
      });

      dispatch(addToast({
        type: 'success',
        message: newArchivedValue 
          ? `${group.name} was successfully archived`
          : `${group.name} was successfully unarchived`,
      }));
    } catch {
      dispatch(addToast({
        type: 'error',
        message: 'Something went wrong! We weren\'t able to update the group. Please try again later.',
      }));
    }
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
            : isHovered
            ? '1px solid #D5D9E2' // Lynch-200
            : '1px solid #ECEEF2', // Lynch-100
          background: isSelected
            ? 'linear-gradient(0deg, rgba(245, 242, 255, 0.20) 0%, rgba(245, 242, 255, 0.20) 100%), #F6F7F9' // Lynch-50
            : isHovered
            ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)'
            : '#F6F7F9', // Lynch-50
          boxShadow: isSelected || isHovered
            ? '0 1px 4px 0 #ECEEF2' // Lynch-100
            : 'none',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
        onClick={onClick}
      >
        {/* Top Row: Title */}
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
            {group.name}
          </h3>
        </div>

        {/* Bottom Row: Details and Time */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center" style={{ gap: '16px' }}>
            {/* Chats Count */}
            <div className="flex items-center" style={{ gap: '4px' }}>
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
                {chatsCount}
              </span>
              <div className="flex items-center" style={{ paddingTop: '2px' }}>
                <MessageSquareText
                  size={16}
                  style={{ color: cssVar(CSS_VARS.gray600) }}
                />
              </div>
            </div>
            {/* Pins Count */}
            <div className="flex items-center" style={{ gap: '4px' }}>
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
                {pinsCount}
              </span>
              <div className="flex items-center" style={{ paddingTop: '2px' }}>
                <Pin
                  size={16}
                  style={{ color: cssVar(CSS_VARS.gray600) }}
                />
              </div>
            </div>
          </div>
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
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
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
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                color: cssVar(CSS_VARS.gray700),
              }}
            >
              {isStarred ? (
                <>
                  <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={16} style={{ color: cssVar(CSS_VARS.gray600), position: 'absolute' }} />
                    <div
                      style={{
                        position: 'absolute',
                        width: '14px',
                        height: '1.5px',
                        background: cssVar(CSS_VARS.gray600),
                        transform: 'rotate(45deg)',
                      }}
                    />
                  </div>
                  <span>Unstar</span>
                </>
              ) : (
                <>
                  <Star size={16} style={{ color: cssVar(CSS_VARS.gray600) }} />
                  <span>Star</span>
                </>
              )}
            </button>
            
            {/* Archive / Unarchive */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={handleArchive}
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                color: cssVar(CSS_VARS.gray700),
              }}
            >
              {isArchived ? (
                <>
                  <ArchiveX size={16} style={{ color: cssVar(CSS_VARS.gray600) }} />
                  <span>Unarchive</span>
                </>
              ) : (
                <>
                  <Archive size={16} style={{ color: cssVar(CSS_VARS.gray600) }} />
                  <span>Archive</span>
                </>
              )}
            </button>
            
            {/* Separator */}
            <div style={{ height: '1px', background: cssVar(CSS_VARS.gray200), margin: '4px 0' }} />
            
            {/* Delete */}
            <button
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors"
              onClick={handleDelete}
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                color: '#EF4444', // Orange-red color for delete
              }}
            >
              <Trash2 size={16} style={{ color: '#EF4444' }} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Rename Group Modal */}
      <RenameGroupModal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setIsHovered(false);
          setIsMenuOpen(false);
        }}
        group={group}
      />

      {/* Delete Group Modal */}
      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setIsHovered(false);
          setIsMenuOpen(false);
        }}
        groups={[group]}
        onDeleteComplete={() => {
          setIsDeleteModalOpen(false);
          setIsHovered(false);
          setIsMenuOpen(false);
        }}
      />
    </div>
  );
}


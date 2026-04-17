'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Share2, PinOff, Copy, Edit, GripHorizontal, Expand, MoreVertical, Check, ExternalLink } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MarkdownRenderer from '@/components/ui/markdown-renderer';
import { extractTitleFromContent } from '@/lib/utils/extractTitle';

/**
 * Formats content for rendering in the pin board.
 * If content is chart JSON, wraps it in the proper batch2-response format.
 */
function formatContentForRendering(content: string): string {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(content);
    
    // Check if it's a chart object
    if (parsed && typeof parsed === 'object' && parsed.type === 'chart') {
      // Wrap in batch2-response format
      const batch2Response = {
        type: 'batch2',
        blocks: [parsed]
      };
      return `<div data-type="batch2-response">${JSON.stringify(batch2Response)}</div>`;
    }
    
    // If it's already in the correct format, return as is
    return content;
  } catch {
    // Not JSON, return as is (regular markdown/text)
    return content;
  }
}

interface PinnedItemCardProps {
  item: {
    id: string;
    content: string;
    title?: string;
    note?: string;
    type: 'message' | 'response';
    pinnedAt?: Date;
    conversationId?: string;
  };
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onCopy: () => void;
  onShare: () => void;
  onEdit: () => void;
  onUnpin: (id: string) => void;
  onDelete?: () => void;
  onExpand?: () => void;
  showHoverMenu?: boolean; // Control whether to show hover menu (default: true)
  isSelected?: boolean;
  onSelect?: () => void;
  checkboxPosition?: 'left' | 'right';
  variant?: 'grid' | 'list'; // 'grid' for pinned page, 'list' for right panel
  onViewChat?: () => void;
}

export function PinnedItemCard({
  item,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onCopy,
  onShare,
  onEdit,
  onUnpin,
  onExpand,
  showHoverMenu = true, // Default to true for backward compatibility
  isSelected = false,
  onSelect,
  checkboxPosition = 'left',
  variant = 'list', // Default to 'list' for backward compatibility (right panel)
  onViewChat,
}: PinnedItemCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const title = item.title || extractTitleFromContent(item.content);

  // Format timestamp
  const formatTimeAgo = (date?: Date) => {
    if (!date) return '12 hours ago';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const timeAgo = formatTimeAgo(item.pinnedAt);

  // Original list layout for right panel
  if (variant === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          style={{
            display: 'flex',
            padding: '8px 24px 12px 2px',
            alignItems: 'flex-start',
            alignSelf: 'stretch',
            borderRadius: '8px',
            border: '1px solid var(--Lynch-200, #D5D9E2)',
            background: 'var(--Lynch-50, #F6F7F9)',
          }}
        >
          {/* Menu icon */}
          <div
            {...attributes}
            {...listeners}
            style={{
              display: 'flex',
              width: '24px',
              justifyContent: 'center',
              alignItems: 'center',
              alignSelf: 'stretch',
              cursor: 'grab',
            }}
          >
            <GripHorizontal 
              size={16}
              style={{
                color: 'var(--Lynch-300, #B1BBC8)',
              }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            {/* Header */}
            <div
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1,
                flex: '1 0 0',
                minHeight: '24px',
                minWidth: 0,
                overflow: 'hidden',
                color: 'var(--Lynch-600, #526077)',
                textOverflow: 'ellipsis',
                fontFamily: 'Manrope',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 700,
                lineHeight: '24px',
                letterSpacing: '0.09px',
              }}
            >
              {title || 'Untitled'}
            </div>

            {/* Pinned response data - reduce maxHeight if note exists */}
            <div
              style={{
                display: 'flex',
                minHeight: '120px',
                maxHeight: item.note ? '160px' : '255px', // Reduce height if note exists
                padding: '8px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '10px',
                alignSelf: 'stretch',
                borderRadius: '8px',
                border: '1px solid var(--Lynch-50, #F6F7F9)',
                background: 'rgba(255, 255, 255, 0.60)',
                boxShadow: '0 1px 4px 0 var(--Lynch-200, #D5D9E2) inset',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  overflow: 'auto',
                  maxHeight: item.note ? '144px' : '239px', // 160px - 16px padding if note, else 255px - 16px
                }}
                className="custom-scrollbar"
              >
                <MarkdownRenderer 
                  content={formatContentForRendering(item.content)} 
                  isPinnedBoard={true} 
                />
              </div>
            </div>

            {/* Note section - only show if note exists */}
            {item.note && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.40)',
                  opacity: 0.8,
                  alignSelf: 'stretch',
                  width: '100%',
                }}
              >
                <p
                  style={{
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2, // Truncate after 2 lines
                    flex: '1 0 0',
                    minHeight: 0,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.09px',
                    color: 'var(--Lynch-700, #434E61)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.note}
                </p>
              </div>
            )}
          </div>

          {/* Hover menu - right side */}
          {showHoverMenu && isHovered && (
            <div
              className="absolute flex flex-col gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-10"
              style={{
                right: '-8px',
                top: '50%',
                transform: 'translateY(-50%)',
                minWidth: '32px',
              }}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
              {onExpand && (
                <button
                  onClick={onExpand}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Expand"
                  aria-label="Expand"
                >
                  <Expand className="h-4 w-4 text-gray-600" />
                </button>
              )}
              {onViewChat && item.conversationId && (
                <button
                  onClick={onViewChat}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="View in Chat"
                  aria-label="View in Chat"
                >
                  <ExternalLink className="h-4 w-4 text-gray-600" />
                </button>
              )}
              <button
                onClick={onShare}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Share"
                aria-label="Share"
              >
                <Share2 className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={onCopy}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Copy"
                aria-label="Copy"
              >
                <Copy className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={onEdit}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Edit"
                aria-label="Edit"
              >
                <Edit className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => onUnpin(item.id)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Unpin"
                aria-label="Unpin"
              >
                <PinOff
                  className="h-4 w-4"
                  style={{ color: 'var(--color-secondary-600)' }}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid layout for pinned page
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          height: '248px',
          width: '423px',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Checkbox Left - Show on hover or when selected */}
        {checkboxPosition === 'left' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: (isSelected || isHovered) ? 'center' : 'flex-start',
              width: '16px',
              flexShrink: 0,
              height: '100%',
              paddingTop: '8px',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {onSelect && (
              <button
                onClick={onSelect}
                style={{
                  width: '16px',
                  height: '16px',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  opacity: (isSelected || isHovered) ? 1 : 0,
                  pointerEvents: (isSelected || isHovered) ? 'auto' : 'none',
                  transition: 'opacity 0.2s ease',
                }}
              >
                {isSelected ? (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'var(--Electric-Violet-500, #8955FD)',
                      border: '1px solid var(--Electric-Violet-500, #8955FD)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} style={{ color: 'var(--Electric-Violet-50, #F5F2FF)' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid var(--Lynch-400, #8695AA)',
                    }}
                  />
                )}
              </button>
            )}
          </div>
        )}

        {/* Card Content */}
        <div
          style={{
            width: '391px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 16px 12px 16px',
            borderRadius: '8px',
            border: isSelected
              ? '1px solid var(--Electric-Violet-200, #DCD4FF)'
              : '1px solid var(--Lynch-100, #ECEEF2)',
            background: isSelected
              ? 'linear-gradient(90deg, rgba(245, 242, 255, 0.2) 0%, rgba(245, 242, 255, 0.2) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)'
              : 'var(--Lynch-50, #F6F7F9)',
            boxShadow: isSelected
              ? '0px 1px 4px 0px var(--Lynch-100, #ECEEF2)'
              : 'none',
            height: '248px',
          }}
        >
          {/* Content Wrapper - 224px height as per design */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              height: '224px',
            }}
          >
            {/* Title Row */}
            <div
              style={{
                display: 'flex',
                height: '24px',
                alignItems: 'center',
                gap: isSelected ? '10px' : (isHovered ? '8px' : '8px'),
              }}
            >
            <p
              style={{
                flex: '1 0 0',
                fontFamily: 'Manrope',
                fontSize: '16px',
                fontStyle: 'normal',
                fontWeight: 600,
                lineHeight: '24px',
                color: 'var(--Lynch-700, #434E61)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {title || 'Untitled'}
            </p>
            {/* 3-dot menu - Show on hover or when selected */}
            <div
              ref={menuRef}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (isHovered || isSelected) ? 1 : 0,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  padding: '4px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <MoreVertical size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
              </button>

              {/* Context Menu - Only show for grid variant (pinned page) */}
              {variant === 'grid' && isMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '28px',
                    right: '0',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0px 4px 12px 0px rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--Lynch-100, #ECEEF2)',
                    padding: '4px',
                    minWidth: '160px',
                    zIndex: 1000,
                  }}
                >
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onEdit();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontFamily: 'Manrope',
                        fontSize: '13px',
                        fontWeight: 500,
                        lineHeight: '20px',
                        color: 'var(--Lynch-700, #434E61)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--Lynch-50, #F6F7F9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Edit size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                      <span>Edit</span>
                    </button>
                  )}
                  {onExpand && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onExpand();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontFamily: 'Manrope',
                        fontSize: '13px',
                        fontWeight: 500,
                        lineHeight: '20px',
                        color: 'var(--Lynch-700, #434E61)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--Lynch-50, #F6F7F9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Expand size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                      <span>Expand</span>
                    </button>
                  )}
                  {onUnpin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onUnpin(item.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontFamily: 'Manrope',
                        fontSize: '13px',
                        fontWeight: 500,
                        lineHeight: '20px',
                        color: 'var(--Lynch-700, #434E61)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--Lynch-50, #F6F7F9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <PinOff size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                      <span>Unpin</span>
                    </button>
                  )}
                      {onViewChat && item.conversationId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            onViewChat();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '8px 12px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontFamily: 'Manrope',
                            fontSize: '13px',
                            fontWeight: 500,
                            lineHeight: '20px',
                            color: 'var(--Lynch-700, #434E61)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--Lynch-50, #F6F7F9)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <ExternalLink size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                          <span>View in Chat</span>
                        </button>
                      )}
                  {onShare && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onShare();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontFamily: 'Manrope',
                        fontSize: '13px',
                        fontWeight: 500,
                        lineHeight: '20px',
                        color: 'var(--Lynch-700, #434E61)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--Lynch-50, #F6F7F9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Share2 size={16} style={{ color: 'var(--Lynch-700, #434E61)' }} />
                      <span>Share & Export</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* Preview Content */}
            <div
              style={{
                flex: '1 0 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minHeight: '120px',
                maxHeight: '160px',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid var(--Lynch-50, #F6F7F9)',
                background: 'rgba(255, 255, 255, 0.6)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
              }}
              className="custom-scrollbar"
            >
              <MarkdownRenderer 
                content={formatContentForRendering(item.content)} 
                isPinnedBoard={true} 
              />
            </div>
              {/* Inner shadow */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  boxShadow: 'inset 0px 1px 4px 0px var(--Lynch-200, #D5D9E2)',
                  borderRadius: '8px',
                }}
              />
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: item.note ? 'space-between' : 'flex-end',
                gap: '40px',
                paddingTop: '8px',
                color: 'var(--Lynch-600, #526077)',
              }}
            >
              {item.note && (
                <p
                  style={{
                    flex: '1 0 0',
                    fontFamily: 'Manrope',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}
                >
                  {item.note}
                </p>
              )}
              <p
                style={{
                  fontFamily: 'Manrope',
                  fontSize: '10px',
                  fontStyle: 'normal',
                  fontWeight: 600,
                  lineHeight: '16px',
                  letterSpacing: '0.18px',
                  textAlign: 'right',
                  margin: 0,
                }}
              >
                {timeAgo}
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox Right - Show on hover or when selected */}
        {checkboxPosition === 'right' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: (isSelected || isHovered) ? 'center' : 'flex-start',
              width: '16px',
              flexShrink: 0,
              height: '100%',
              paddingTop: '8px',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {onSelect && (
              <button
                onClick={onSelect}
                style={{
                  width: '16px',
                  height: '16px',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  opacity: (isSelected || isHovered) ? 1 : 0,
                  pointerEvents: (isSelected || isHovered) ? 'auto' : 'none',
                  transition: 'opacity 0.2s ease',
                  position: 'relative',
                  zIndex: 11,
                }}
              >
                {isSelected ? (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'var(--Electric-Violet-500, #8955FD)',
                      border: '1px solid var(--Electric-Violet-500, #8955FD)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} style={{ color: 'var(--Electric-Violet-50, #F5F2FF)' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid var(--Lynch-400, #8695AA)',
                    }}
                  />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


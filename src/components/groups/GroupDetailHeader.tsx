'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, PencilLine, Star, MoreVertical, Check, CheckCheck, Minus, Archive, ArchiveX, Trash2, DiamondMinus } from 'lucide-react';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { useClickOutside } from '@/hooks/useClickOutside';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
  starred?: boolean;
  archived?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface GroupDetailHeaderProps {
  group: Group;
  onRename: () => void;
  onStar: () => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll?: () => void;
  isIndeterminate: boolean;
  isAllSelected: boolean;
  onDeleteClick?: () => void;
  onArchiveClick?: () => void;
  onUnGroupClick?: () => void;
  onArchiveGroup?: () => void;
  onDeleteGroup?: () => void;
}

export default function GroupDetailHeader({
  group,
  onRename,
  onStar,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  isIndeterminate,
  isAllSelected,
  onDeleteClick,
  onArchiveClick,
  onUnGroupClick,
  onArchiveGroup,
  onDeleteGroup,
}: GroupDetailHeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const showActions = selectedCount > 0;
  const showCheckbox = selectedCount > 0;
  const isArchived = group.archived ?? false;
  
  // Close menu on outside click
  useClickOutside(menuRef, () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  });

  const handleCheckboxClick = () => {
    if (onDeselectAll) {
      onDeselectAll();
    }
  };

  const handleButtonClick = () => {
    if (!isAllSelected && !isIndeterminate) {
      onSelectAll();
    }
  };

  return (
    <div
      className="flex flex-col w-full"
      style={{
        gap: '12px',
        paddingTop: '48px',
      }}
    >
      {/* Wrapper with Page Title */}
      <div
        className="flex flex-col"
        style={{
          width: '100%',
          gap: '24px',
          paddingLeft: '32px',
          paddingRight: '32px',
        }}
      >
        {/* Page Title and Actions */}
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <div className="flex items-center justify-between w-full" style={{ height: '40px' }}>
            <h1
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '25px',
                fontWeight: 500,
                lineHeight: '32px',
                letterSpacing: '-0.27px',
                color: cssVar(CSS_VARS.gray700),
              }}
            >
              {group.name}
            </h1>
            <div className="flex items-center" style={{ gap: '8px' }}>
              <div className="flex items-center" style={{ gap: '4px' }}>
                <button
                  onClick={onRename}
                  className="flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer"
                  style={{
                    padding: '4px',
                  }}
                  title="Edit"
                >
                  <PencilLine
                    size={16}
                    style={{ color: cssVar(CSS_VARS.gray700) }}
                  />
                </button>
                <button
                  onClick={onStar}
                  className="flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer"
                  style={{
                    padding: '4px',
                  }}
                  title={group.starred ? 'Unstar' : 'Star'}
                >
                  {group.starred ? (
                    <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Star size={16} style={{ color: cssVar(CSS_VARS.primary500), position: 'absolute' }} />
                      <div
                        style={{
                          position: 'absolute',
                          width: '14px',
                          height: '1.5px',
                          background: cssVar(CSS_VARS.primary500),
                          transform: 'rotate(45deg)',
                        }}
                      />
                    </div>
                  ) : (
                    <Star size={16} style={{ color: cssVar(CSS_VARS.gray700) }} />
                  )}
                </button>
              </div>
              <div className="relative">
                <button
                  ref={buttonRef}
                  className="flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer"
                  style={{
                    padding: '4px',
                  }}
                  title="More options"
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
                      minWidth: '93px',
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      padding: '4px 0',
                      border: `1px solid ${cssVar(CSS_VARS.gray200)}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Archive / Unarchive */}
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        if (onArchiveGroup) {
                          onArchiveGroup();
                        }
                        setIsMenuOpen(false);
                      }}
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
                      onClick={() => {
                        if (onDeleteGroup) {
                          onDeleteGroup();
                        }
                        setIsMenuOpen(false);
                      }}
                      style={{
                        fontFamily: 'Manrope, var(--font-manrope)',
                        fontSize: '14px',
                        fontWeight: 500,
                        lineHeight: '20px',
                        color: '#EF4444',
                      }}
                    >
                      <Trash2 size={16} style={{ color: '#EF4444' }} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Breadcrumbs */}
          <div className="flex items-center" style={{ gap: '4px' }}>
            <button
              onClick={() => router.push('/groups')}
              className="flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer"
              style={{
                padding: '0',
                gap: '4px',
                borderRadius: '2px',
                background: 'transparent',
                border: 'none',
              }}
            >
              <Layers
                size={16}
                style={{ color: cssVar(CSS_VARS.gray700) }}
              />
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.09px',
                  color: cssVar(CSS_VARS.gray700),
                }}
              >
                Groups
              </span>
            </button>
            <span
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                color: cssVar(CSS_VARS.gray500),
              }}
            >
              {' > '}
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.09px',
                  color: cssVar(CSS_VARS.gray700),
                }}
              >
                {group.name}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Page Action Bar */}
      <div
        className="flex items-center"
        style={{
          width: '100%',
          paddingRight: '32px',
          gap: '16px',
        }}
      >
        {/* Checkbox */}
        <div className="flex items-center justify-center" style={{ width: '16px', height: '16px' }}>
          {showCheckbox && (
            <div
              className="flex items-center justify-center cursor-pointer"
              onClick={handleCheckboxClick}
              style={{
                width: '16px',
                height: '16px',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: `1px solid ${isIndeterminate || isAllSelected ? cssVar(CSS_VARS.primary500) : cssVar(CSS_VARS.gray400)}`,
                  background: isIndeterminate || isAllSelected ? cssVar(CSS_VARS.primary500) : 'rgba(255, 255, 255, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isIndeterminate ? (
                  <Minus
                    size={12}
                    style={{ color: '#F6F7F9' }}
                    strokeWidth={3}
                  />
                ) : isAllSelected ? (
                  <Check
                    size={12}
                    style={{ color: '#F6F7F9' }}
                    strokeWidth={3}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div
          className="flex flex-1 items-center"
          style={{
            minHeight: 0,
            justifyContent: showActions ? 'center' : 'space-between',
            position: 'relative',
          }}
        >
          {/* Select All Button */}
          <div
            className="flex items-center"
            style={{
              width: '228px',
              paddingLeft: '4px',
              position: showActions ? 'absolute' : 'relative',
              left: showActions ? '0' : 'auto',
            }}
          >
            <button
              className="flex items-center justify-center transition-colors cursor-pointer hover:opacity-90"
              onClick={handleButtonClick}
              style={{
                padding: '6px 12px',
                gap: '4px',
                border: 'none',
                background: 'transparent',
              }}
            >
              <CheckCheck
                size={16}
                style={{ color: '#6C20E1' }}
              />
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.09px',
                  paddingLeft: '2px',
                  paddingRight: '2px',
                  color: '#6C20E1',
                }}
              >
                Select All ({selectedCount}/{totalCount})
              </span>
            </button>
          </div>

          {/* Actions - Centered */}
          {showActions && (
            <div
              className="flex items-center"
              style={{
                gap: '8px',
              }}
            >
              <button
                onClick={onUnGroupClick}
                className="flex items-center justify-center rounded-lg transition-colors hover:opacity-90 cursor-pointer"
                style={{
                  width: '36px',
                  height: '36px',
                  padding: '10px',
                  border: `1px solid ${cssVar(CSS_VARS.primary300)}`,
                  background: cssVar(CSS_VARS.primary50),
                  boxShadow: `0px 1px 2px 0px ${cssVar(CSS_VARS.primary100)}`,
                }}
                title="Remove from Group"
              >
                <DiamondMinus
                  size={16}
                  style={{ color: '#6C20E1' }}
                />
              </button>
              <button
                onClick={onArchiveClick}
                className="flex items-center justify-center rounded-lg transition-colors hover:opacity-90 cursor-pointer"
                style={{
                  width: '36px',
                  height: '36px',
                  padding: '10px',
                  border: `1px solid ${cssVar(CSS_VARS.primary300)}`,
                  background: cssVar(CSS_VARS.primary50),
                  boxShadow: `0px 1px 2px 0px ${cssVar(CSS_VARS.primary100)}`,
                }}
                title="Archive"
              >
                <Archive
                  size={16}
                  style={{ color: '#6C20E1' }}
                />
              </button>
              <button
                className="flex items-center justify-center rounded-lg transition-colors hover:opacity-90 cursor-pointer"
                style={{
                  width: '36px',
                  height: '36px',
                  padding: '10px',
                  border: `1px solid ${cssVar(CSS_VARS.gray300)}`,
                  background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)',
                  boxShadow: `0px 1px 4px 0px ${cssVar(CSS_VARS.gray100)}`,
                }}
                title="Delete"
                onClick={onDeleteClick}
              >
                <Trash2
                  size={16}
                  style={{ color: '#D64933' }}
                />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


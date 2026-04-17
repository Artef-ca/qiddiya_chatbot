/**
 * Group Header Actions component
 * Handles edit, star, and more menu actions
 */

'use client';

import { useState, useRef } from 'react';
import { PencilLine, Star, MoreVertical, Archive, ArchiveX, Trash2 } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { ContextMenu } from '@/components/shared';
import { IconButton } from '@/components/ui/IconButton';
import { themeColors, themeRadius, themeSpacing } from '@/lib/utils/theme';

interface GroupHeaderActionsProps {
  group: {
    id: string;
    name: string;
    starred?: boolean;
    archived?: boolean;
  };
  onRename: () => void;
  onStar: () => void;
  onArchiveGroup?: () => void;
  onDeleteGroup?: () => void;
}

export function GroupHeaderActions({
  group,
  onRename,
  onStar,
  onArchiveGroup,
  onDeleteGroup,
}: GroupHeaderActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isArchived = group.archived ?? false;

  const menuItems = [
    {
      label: isArchived ? 'Unarchive' : 'Archive',
      icon: isArchived ? (
        <ArchiveX size={16} style={{ color: themeColors.gray600() }} />
      ) : (
        <Archive size={16} style={{ color: themeColors.gray600() }} />
      ),
      onClick: () => {
        if (onArchiveGroup) {
          onArchiveGroup();
        }
        setIsMenuOpen(false);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} style={{ color: themeColors.error() }} />,
      onClick: () => {
        if (onDeleteGroup) {
          onDeleteGroup();
        }
        setIsMenuOpen(false);
      },
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="flex items-center" style={{ gap: themeSpacing.sm() }}>
      <div className="flex items-center" style={{ gap: themeSpacing.xs() }}>
        <IconButton
          icon={PencilLine}
          onClick={onRename}
          title="Edit"
          iconSize={16}
          iconColor={themeColors.gray700()}
        />
        <button
          onClick={onStar}
          className="flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer"
          style={{
            padding: themeSpacing.xs(),
          }}
          title={group.starred ? 'Unstar' : 'Star'}
        >
          {group.starred ? (
            <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={16} style={{ color: themeColors.primary500(), position: 'absolute' }} />
              <div
                style={{
                  position: 'absolute',
                  width: '14px',
                  height: '1.5px',
                  background: themeColors.primary500(),
                  transform: 'rotate(45deg)',
                }}
              />
            </div>
          ) : (
            <Star size={16} style={{ color: themeColors.gray700() }} />
          )}
        </button>
      </div>
      <div className="relative">
        <button
          ref={buttonRef}
          className="flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer"
          style={{
            padding: themeSpacing.xs(),
          }}
          title="More options"
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
        
        <ContextMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          items={menuItems}
          minWidth="93px"
        />
      </div>
    </div>
  );
}


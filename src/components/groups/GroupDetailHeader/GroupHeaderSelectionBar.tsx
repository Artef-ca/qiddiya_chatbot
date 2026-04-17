/**
 * Group Header Selection Bar component
 * Handles selection checkbox and action buttons
 */

'use client';

import { SelectAllCheckbox } from '@/components/shared';
import { ActionButton } from '@/components/shared';
import { DiamondMinus, Archive, Trash2 } from 'lucide-react';
import { themeSpacing } from '@/lib/utils/theme';

interface GroupHeaderSelectionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll?: () => void;
  isIndeterminate: boolean;
  isAllSelected: boolean;
  onDeleteClick?: () => void;
  onArchiveClick?: () => void;
  onUnGroupClick?: () => void;
}

export function GroupHeaderSelectionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  isIndeterminate,
  isAllSelected,
  onDeleteClick,
  onArchiveClick,
  onUnGroupClick,
}: GroupHeaderSelectionBarProps) {
  const showActions = selectedCount > 0;
  const showCheckbox = selectedCount > 0;

  return (
    <div
      className="flex items-center"
      style={{
        width: '100%',
        paddingRight: '32px',
        gap: themeSpacing.md(),
      }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center" style={{ width: '16px', height: '16px' }}>
        {showCheckbox && (
          <>
            <SelectAllCheckbox
              selectedCount={selectedCount}
              totalCount={totalCount}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
              showCheckbox={true}
              showButton={false}
            />
          </>
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
            paddingLeft: themeSpacing.xs(),
            position: showActions ? 'absolute' : 'relative',
            left: showActions ? '0' : 'auto',
          }}
        >
          <SelectAllCheckbox
            selectedCount={selectedCount}
            totalCount={totalCount}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            showCheckbox={false}
            showButton={true}
          />
        </div>

        {/* Actions - Centered */}
        {showActions && (
          <div
            className="flex items-center"
            style={{
              gap: themeSpacing.sm(),
            }}
          >
            <ActionButton
              icon={DiamondMinus}
              onClick={onUnGroupClick}
              title="Remove from Group"
              variant="primary"
            />
            <ActionButton
              icon={Archive}
              onClick={onArchiveClick}
              title="Archive"
              variant="primary"
            />
            <ActionButton
              icon={Trash2}
              onClick={onDeleteClick}
              title="Delete"
              variant="danger"
            />
          </div>
        )}
      </div>
    </div>
  );
}


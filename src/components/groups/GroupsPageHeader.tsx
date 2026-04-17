'use client';

import { Layers, Archive, ArchiveX, Trash2 } from 'lucide-react';
import {
  SelectAllCheckbox,
  PageTitle,
  ActionButton,
  FilterTabs,
  HeaderSearchInput,
  SecondaryButton,
} from '@/components/shared';
import { themeSpacing } from '@/lib/utils/theme';

interface GroupsPageHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: 'active' | 'starred' | 'archived';
  onFilterChange: (filter: 'active' | 'starred' | 'archived') => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll?: () => void;
  onDeleteClick?: () => void;
  onArchiveClick?: () => void;
  onUnarchiveClick?: () => void;
  onNewGroupClick?: () => void;
}

const PAGE_WIDTH = 790;
const ACTION_BAR_MIN_WIDTH = 790;
const ACTION_BAR_MARGIN_RIGHT = 30;
const SELECT_ALL_WIDTH = 228;

export default function GroupsPageHeader({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteClick,
  onArchiveClick,
  onUnarchiveClick,
  onNewGroupClick,
}: GroupsPageHeaderProps) {
  const showActions = selectedCount > 0;
  const showCheckbox = selectedCount > 0;

  return (
    <div
      className="flex flex-col w-full items-center"
      style={{ gap: themeSpacing.sm2() }}
    >
      <div
        className="flex flex-col"
        style={{
          width: `${PAGE_WIDTH}px`,
          gap: themeSpacing.lg(),
        }}
      >
        <div className="flex items-center justify-between w-full">
          <PageTitle size="large">Groups</PageTitle>
          <SecondaryButton
            icon={Layers}
            label="New Group"
            onClick={onNewGroupClick ?? (() => {})}
          />
        </div>

        <div className="w-full">
          <HeaderSearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="group name"
          />
        </div>
      </div>

      <div
        className="flex items-center"
        style={{ gap: themeSpacing.md() }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 16, height: 16 }}
        >
          {showCheckbox && (
            <SelectAllCheckbox
              selectedCount={selectedCount}
              totalCount={totalCount}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
              showCheckbox
              showButton={false}
            />
          )}
        </div>

        <div
          className="flex flex-1 items-center justify-between"
          style={{
            minHeight: 0,
            minWidth: `${ACTION_BAR_MIN_WIDTH}px`,
            marginRight: `${ACTION_BAR_MARGIN_RIGHT}px`,
          }}
        >
          <div
            className="flex items-center"
            style={{ width: `${SELECT_ALL_WIDTH}px` }}
          >
            <SelectAllCheckbox
              selectedCount={selectedCount}
              totalCount={totalCount}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
              showCheckbox={false}
              showButton
              buttonText={`Select All Loaded (${selectedCount}/${totalCount})`}
            />
          </div>

          {showActions && (
            <div
              className="flex items-center"
              style={{ gap: themeSpacing.sm() }}
            >
              {filter !== 'archived' ? (
                <ActionButton
                  icon={Archive}
                  onClick={onArchiveClick}
                  title="Archive"
                  variant="primary"
                />
              ) : (
                <ActionButton
                  icon={ArchiveX}
                  onClick={onUnarchiveClick}
                  title="Unarchive"
                  variant="primary"
                />
              )}
              <ActionButton
                icon={Trash2}
                onClick={onDeleteClick}
                title="Delete"
                variant="danger"
              />
            </div>
          )}

          <div
            className="flex flex-col items-end justify-center"
            style={{
              paddingTop: '2px',
              paddingBottom: '2px',
            }}
          >
            <FilterTabs value={filter} onChange={onFilterChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Archive, ArchiveX, Trash2, MessageSquarePlus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { setActiveConversation } from '@/store/slices/chatSlice';
import { clearProState } from '@/lib/chatProState';
import {
  SelectAllCheckbox,
  PageTitle,
  ActionButton,
  FilterTabs,
  HeaderSearchInput,
  SecondaryButton,
} from '@/components/shared';
import { themeColors, themeSpacing } from '@/lib/utils/theme';

interface PageHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: 'active' | 'starred' | 'archived';
  onFilterChange: (filter: 'active' | 'starred' | 'archived') => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll?: () => void;
  onDeleteClick?: () => void;
  onAddToGroupClick?: () => void;
  onArchiveClick?: () => void;
  onUnarchiveClick?: () => void;
}

const PAGE_WIDTH = 790;
const ACTION_BAR_MIN_WIDTH = 790;
const ACTION_BAR_MARGIN_RIGHT = 30;
const SELECT_ALL_WIDTH = 228;

export default function PageHeader({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteClick,
  onAddToGroupClick,
  onArchiveClick,
  onUnarchiveClick,
}: PageHeaderProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const showActions = selectedCount > 0;
  const showCheckbox = selectedCount > 0;

  const handleNewChat = () => {
    clearProState();
    dispatch(setActiveConversation(null));
    router.push('/');
  };

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
          <PageTitle size="large">Chats</PageTitle>
          <SecondaryButton
            icon={MessageSquarePlus}
            label="New Chat"
            onClick={handleNewChat}
          />
        </div>

        <div className="w-full">
          <HeaderSearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="chat name"
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
              <button
                type="button"
                onClick={onAddToGroupClick}
                className="flex items-center justify-center rounded-lg transition-colors hover:opacity-90 cursor-pointer"
                style={{
                  padding: '9.2px',
                  border: `1px solid ${themeColors.primary300()}`,
                  background: themeColors.primary50(),
                  boxShadow: `0px 1px 2px 0px ${themeColors.primary100()}`,
                }}
                title="Add to Group"
              >
                <Image
                  src="/AddToGroup.svg"
                  alt="Add to Group"
                  width={16}
                  height={16}
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(30%) sepia(95%) saturate(2878%) hue-rotate(250deg) brightness(95%) contrast(95%)',
                  }}
                />
              </button>
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

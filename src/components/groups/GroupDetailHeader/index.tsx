/**
 * Group Detail Header component
 * Main header for group detail page with title, actions, and selection controls
 */

'use client';

import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import { PageTitle, Breadcrumb } from '@/components/shared';
import { GroupHeaderActions } from './GroupHeaderActions';
import { GroupHeaderSelectionBar } from './GroupHeaderSelectionBar';
import { themeSpacing } from '@/lib/utils/theme';

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
          gap: themeSpacing.lg(),
          paddingLeft: '32px',
          paddingRight: '32px',
        }}
      >
        {/* Page Title and Actions */}
        <div className="flex flex-col" style={{ gap: themeSpacing.xs() }}>
          <div className="flex items-center justify-between w-full" style={{ height: '40px' }}>
            <PageTitle size="medium">{group.name}</PageTitle>
            <GroupHeaderActions
              group={group}
              onRename={onRename}
              onStar={onStar}
              onArchiveGroup={onArchiveGroup}
              onDeleteGroup={onDeleteGroup}
            />
          </div>
          
          {/* Breadcrumbs */}
          <Breadcrumb
            items={[
              {
                label: 'Groups',
                icon: <Layers size={16} style={{ color: 'var(--color-gray-700)' }} />,
                onClick: () => router.push('/groups'),
              },
              {
                label: group.name,
              },
            ]}
          />
        </div>
      </div>

      {/* Page Action Bar */}
      <GroupHeaderSelectionBar
        selectedCount={selectedCount}
        totalCount={totalCount}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        isIndeterminate={isIndeterminate}
        isAllSelected={isAllSelected}
        onDeleteClick={onDeleteClick}
        onArchiveClick={onArchiveClick}
        onUnGroupClick={onUnGroupClick}
      />
    </div>
  );
}


'use client';

import { Check } from 'lucide-react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

interface Group {
  id: string;
  name: string;
  conversationIds: string[];
}

interface GroupListProps {
  groups: Group[];
  selectedGroupId: string | null;
  onGroupSelect: (groupId: string) => void;
}

export function GroupList({ groups, selectedGroupId, onGroupSelect }: GroupListProps) {
  return (
    <>
      {groups.map((group) => {
        const isSelected = selectedGroupId === group.id;
        return (
          <div
            key={group.id}
            onClick={() => onGroupSelect(group.id)}
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              padding: '8px 16px',
              borderRadius: theme.borderRadius.base,
              minHeight: '40px',
              cursor: 'pointer',
              backgroundColor: isSelected
                ? 'rgba(113, 34, 244, 0.05)'
                : 'transparent',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(113, 34, 244, 0.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span
              style={{
                flex: 1,
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: theme.typography.text.base.size,
                fontWeight: theme.typography.weights.medium.value,
                lineHeight: '24px',
                color: cssVar(CSS_VARS.textPrimary),
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {group.name}
            </span>
            {isSelected && (
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={24} style={{ color: '#3E8FFF' }} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}


'use client';

import { Plus } from 'lucide-react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

interface CreateNewGroupOptionProps {
  searchQuery: string;
  onCreateNew: () => void;
  isSubmitting: boolean;
}

export function CreateNewGroupOption({
  searchQuery,
  onCreateNew,
  isSubmitting,
}: CreateNewGroupOptionProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '8px 16px',
        borderRadius: theme.borderRadius.base,
        minHeight: '40px',
      }}
    >
      <p
        style={{
          fontFamily: 'Manrope, var(--font-manrope)',
          fontSize: theme.typography.text.base.size,
          fontWeight: theme.typography.weights.regular.value,
          lineHeight: '24px',
          color: cssVar(CSS_VARS.textPrimary),
          margin: 0,
        }}
      >
        There&apos;s no group called &quot;
        <span style={{ fontWeight: theme.typography.weights.medium.value }}>
          {searchQuery}
        </span>
        &quot;
      </p>
      <button
        onClick={onCreateNew}
        disabled={isSubmitting}
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          padding: 0,
          alignSelf: 'flex-start',
          opacity: isSubmitting ? 0.5 : 1,
        }}
      >
        <Plus size={20} style={{ color: theme.colors.primary.DEFAULT }} />
        <span
          style={{
            fontFamily: 'Manrope, var(--font-manrope)',
            fontSize: theme.typography.text.base.size,
            fontWeight: theme.typography.weights.semibold.value,
            lineHeight: '24px',
            color: theme.colors.primary.DEFAULT,
          }}
        >
          Add &quot;{searchQuery}&quot; as a new group
        </span>
      </button>
    </div>
  );
}


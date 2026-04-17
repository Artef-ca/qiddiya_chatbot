'use client';

import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import type { Conversation } from '@/types';

interface DeleteChatContentProps {
  conversationsToDelete: Conversation[];
  count: number;
}

export function DeleteChatContent({ conversationsToDelete, count }: DeleteChatContentProps) {
  const isSingleChat = count === 1;
  const isMultipleSmall = count >= 2 && count < 5;

  return (
    <div style={{ paddingBottom: theme.spacing.md }}>
      {isSingleChat ? (
        <div>
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.base.size,
              fontWeight: theme.typography.weights.medium.value,
              lineHeight: '24px',
              color: cssVar(CSS_VARS.textPrimary),
              margin: 0,
            }}
          >
            Are you sure you want to delete:
          </p>
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.base.size,
              fontWeight: theme.typography.weights.bold.value,
              lineHeight: '24px',
              color: cssVar(CSS_VARS.textPrimary),
              margin: '4px 0 0 0',
            }}
          >
            {conversationsToDelete[0]?.title}?
          </p>
        </div>
      ) : isMultipleSmall ? (
        <div>
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.base.size,
              fontWeight: theme.typography.weights.medium.value,
              lineHeight: '24px',
              color: cssVar(CSS_VARS.textPrimary),
              margin: 0,
              marginBottom: theme.spacing.sm,
            }}
          >
            Are you sure you want to delete... ({count})?
          </p>
          <div style={{ marginTop: theme.spacing.sm }}>
            {conversationsToDelete.map((conv) => (
              <p
                key={conv.id}
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: theme.typography.text.base.size,
                  fontWeight: theme.typography.weights.bold.value,
                  lineHeight: '24px',
                  color: cssVar(CSS_VARS.textPrimary),
                  margin: '4px 0',
                }}
              >
                - {conv.title}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.base.size,
              fontWeight: theme.typography.weights.medium.value,
              lineHeight: '24px',
              color: cssVar(CSS_VARS.textPrimary),
              margin: 0,
              marginBottom: theme.spacing.sm,
            }}
          >
            Are you sure you want to delete all{' '}
            <span style={{ fontWeight: theme.typography.weights.semibold.value }}>
              {count} chats
            </span>
            ?
          </p>
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.base.size,
              fontWeight: theme.typography.weights.semibold.value,
              lineHeight: '24px',
              color: theme.colors.error,
              margin: '8px 0 0 0',
            }}
          >
            This action is not reversible.
          </p>
        </div>
      )}
    </div>
  );
}


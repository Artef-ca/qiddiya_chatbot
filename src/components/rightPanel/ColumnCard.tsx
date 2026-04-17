'use client';

import Typography from '@/components/ui/Typography';
import { COLORS, BORDER_RADIUS, SPACING } from '@/lib/styles/constants';

interface ColumnCardProps {
  name: string;
  type: string;
}

export default function ColumnCard({ name, type }: ColumnCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        width: '474px',
        height: '40px',
        padding: `${SPACING.sm} 12px ${SPACING.sm} ${SPACING.md}`,
        alignItems: 'center',
        gap: '10px',
        borderRadius: BORDER_RADIUS.base,
        background: COLORS.lynch[50],
      }}
    >
      <Typography
        variant="text-base"
        color={COLORS.lynch[600]}
        style={{ flex: 1 }}
      >
        {name}
      </Typography>
      <Typography
        variant="text-tiny"
        color={COLORS.lynch[600]}
        align="right"
      >
        {type}
      </Typography>
    </div>
  );
}


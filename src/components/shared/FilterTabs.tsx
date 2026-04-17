/**
 * Reusable filter tabs (e.g. Active, Starred, Archived)
 * Uses theme for colors and spacing
 */

'use client';

import { themeColors, themeRadius, themeSpacing } from '@/lib/utils/theme';

export type FilterTabValue = 'active' | 'starred' | 'archived';

const FILTER_LABELS: Record<FilterTabValue, string> = {
  active: 'Active',
  starred: 'Starred',
  archived: 'Archived',
};

const FILTER_OPTIONS: FilterTabValue[] = ['active', 'starred', 'archived'];

interface FilterTabsProps {
  value: FilterTabValue;
  onChange: (value: FilterTabValue) => void;
}

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <div className="flex items-center justify-end">
      {FILTER_OPTIONS.map((filterType, index) => {
        const isActive = value === filterType;
        const isLeft = index === 0;
        const isRight = index === FILTER_OPTIONS.length - 1;
        const borderRadius = isLeft
          ? `${themeRadius.md()} 0 0 ${themeRadius.md()}`
          : isRight
            ? `0 ${themeRadius.md()} ${themeRadius.md()} 0`
            : '0';

        if (isActive) {
          return (
            <button
              key={filterType}
              onClick={() => onChange(filterType)}
              className="flex items-center justify-center transition-all cursor-default"
              style={{
                display: 'flex',
                padding: `${themeSpacing.xs()} ${themeSpacing.sm2()}`,
                justifyContent: 'center',
                alignItems: 'center',
                gap: themeSpacing.xs(),
                borderRadius,
                border: `1px solid ${themeColors.gray100()}`,
                background: `linear-gradient(0deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.50) 100%), ${themeColors.gray50()}`,
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '24px',
                  letterSpacing: '0.09px',
                  color: themeColors.secondary800(),
                  textTransform: 'capitalize',
                }}
              >
                {FILTER_LABELS[filterType]}
              </span>
            </button>
          );
        }

        return (
          <button
            key={filterType}
            onClick={() => onChange(filterType)}
            className="flex items-center justify-center transition-all cursor-pointer"
            style={{
              display: 'flex',
              padding: `${themeSpacing.xs()} ${themeSpacing.sm2()}`,
              justifyContent: 'center',
              alignItems: 'center',
              gap: themeSpacing.xs(),
              borderRadius,
              borderTop: `1px solid ${themeColors.gray100()}`,
              borderRight: `1px solid ${themeColors.gray100()}`,
              borderBottom: `1px solid ${themeColors.gray100()}`,
              background: `linear-gradient(0deg, rgba(255, 255, 255, 0.80) 0%, rgba(255, 255, 255, 0.80) 100%), ${themeColors.gray50()}`,
              boxShadow: `0 1px 4px 0 ${themeColors.gray100()}`,
              transition: 'background 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <span
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                color: themeColors.gray700(),
                textTransform: 'capitalize',
              }}
            >
              {FILTER_LABELS[filterType]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

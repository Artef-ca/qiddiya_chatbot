/**
 * Reusable header search input with theme styling
 */

'use client';

import { Search } from 'lucide-react';
import { themeColors, themeSpacing } from '@/lib/utils/theme';

interface HeaderSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'data-testid'?: string;
}

export function HeaderSearchInput({
  value,
  onChange,
  placeholder = 'Search',
  'data-testid': dataTestId,
}: HeaderSearchInputProps) {
  return (
    <div
      className="flex items-center rounded-lg w-full"
      style={{
        padding: `${themeSpacing.sm()} 14px`,
        gap: themeSpacing.sm(),
        border: `1px solid ${themeColors.gray200()}`,
        background: 'rgba(255, 255, 255, 0.8)',
        boxShadow: `0px 1px 4px 0px ${themeColors.gray100()}`,
      }}
    >
      <Search
        size={20}
        style={{ color: themeColors.gray500(), flexShrink: 0 }}
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none focus:outline-none min-w-0"
        style={{
          fontFamily: 'Manrope, var(--font-manrope)',
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '24px',
          color: themeColors.gray400(),
        }}
        data-testid={dataTestId}
        aria-label={placeholder}
      />
    </div>
  );
}

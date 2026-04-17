/**
 * Reusable Select All Checkbox component
 * Used in headers for bulk selection
 */

'use client';

import { Check, CheckCheck, Minus } from 'lucide-react';
import { themeColors, themeRadius } from '@/lib/utils/theme';
import { cn } from '@/lib/utils';

interface SelectAllCheckboxProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll?: () => void;
  showCheckbox?: boolean;
  showButton?: boolean;
  buttonText?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectAllCheckbox({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  showCheckbox = true,
  showButton = true,
  buttonText,
  disabled = false,
  className,
}: SelectAllCheckboxProps) {
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  const handleCheckboxClick = () => {
    if (onDeselectAll) {
      onDeselectAll();
    }
  };

  const handleButtonClick = () => {
    if (!isAllSelected && !isIndeterminate) {
      onSelectAll();
    }
  };

  return (
    <>
      {/* Checkbox */}
      {showCheckbox && (
        <div className="flex items-center justify-center" style={{ width: '16px', height: '16px' }}>
          {selectedCount > 0 && (
            <div
              className="flex items-center justify-center cursor-pointer"
              onClick={handleCheckboxClick}
              style={{
                width: '16px',
                height: '16px',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: themeRadius.base(),
                  border: `1px solid ${isIndeterminate || isAllSelected ? themeColors.primary500() : themeColors.gray400()}`,
                  background: isIndeterminate || isAllSelected ? themeColors.primary500() : 'rgba(255, 255, 255, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isIndeterminate ? (
                  <Minus
                    size={12}
                    style={{ color: themeColors.backgroundSecondary() }}
                    strokeWidth={3}
                  />
                ) : isAllSelected ? (
                  <Check
                    size={12}
                    style={{ color: themeColors.backgroundSecondary() }}
                    strokeWidth={3}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Select All Button */}
      {showButton && (
        <div className={cn('flex items-center', className)}>
          <button
            type="button"
            className={cn(
              'flex items-center justify-center transition-colors hover:opacity-90',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            )}
            onClick={handleButtonClick}
            disabled={disabled}
            style={{
              padding: '6px 12px',
              gap: '4px',
              border: 'none',
              background: 'transparent',
            }}
          >
            <CheckCheck
              size={16}
              style={{
                color: disabled ? themeColors.neutral400() : themeColors.primary700(),
              }}
            />
            <span
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0.09px',
                paddingLeft: '2px',
                paddingRight: '2px',
                color: disabled ? themeColors.neutral400() : themeColors.primary700(),
                textShadow: !disabled && (isIndeterminate || isAllSelected) ? `0px 1px 2px 0px ${themeColors.primary100()}` : 'none',
              }}
            >
              {buttonText || `Select All (${selectedCount}/${totalCount})`}
            </span>
          </button>
        </div>
      )}
    </>
  );
}


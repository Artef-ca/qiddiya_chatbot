'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { COLORS, TYPOGRAPHY, FONT_FAMILY, BORDER_RADIUS } from '@/lib/styles/constants';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** When "chart", uses white background to match chart card styling */
  variant?: 'default' | 'chart';
}

export default function Select({
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
  disabled = false,
  variant = 'default',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = value ? options.find((opt) => opt.value === value) : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const hasValue = !!selectedOption;
  const displayText = selectedOption ? selectedOption.label : (placeholder || 'Select...');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '4px',
        flex: '1 0 0',
        alignSelf: 'stretch',
      }}
      className={className}
    >
      {label && (
        <div
          style={{
            display: 'flex',
            gap: '2px',
            alignItems: 'flex-start',
          }}
        >
          <p
            style={{
              fontFamily: FONT_FAMILY.manrope,
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: '24px',
              color: COLORS.lynch[900],
              letterSpacing: '0.0897px',
              margin: 0,
            }}
          >
            {label}
          </p>
        </div>
      )}
      <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            width: '100%',
            borderRadius: BORDER_RADIUS.md,
            border: `1px solid ${COLORS.lynch[200]}`,
            background: variant === 'chart' ? 'rgba(255, 255, 255, 0.60)' : (hasValue ? COLORS.lynch[50] : '#FFFFFF'),
            boxShadow: `0px 1px 4px 0px ${COLORS.lynch[100]}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            overflow: 'hidden',
          }}
        >
          {/* Content Area */}
          <div
            style={{
              display: 'flex',
              flex: '1 0 0',
              gap: '8px',
              alignItems: 'center',
              minHeight: 0,
              minWidth: 0,
              paddingLeft: '14px',
              paddingRight: 0,
              paddingTop: '6px',
              paddingBottom: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flex: '1 0 0',
                gap: '8px',
                alignItems: 'flex-start',
                minHeight: 0,
                minWidth: 0,
              }}
            >
              <p
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1,
                  flex: '1 0 0',
                  overflow: 'hidden',
                  color: 'var(--Lynch-700, #434E61)',
                  textOverflow: 'ellipsis',
                  fontFamily: FONT_FAMILY.manrope,
                  fontSize: '13px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: '24px',
                  letterSpacing: '0.09px',
                  minHeight: 0,
                  minWidth: 0,
                  margin: 0,
                }}
              >
                {displayText}
              </p>
            </div>
          </div>
          {/* Dropdown Icon Area */}
          <div
            style={{
              display: 'flex',
              padding: '6px 14px',
              justifyContent: 'space-between',
              alignItems: 'center',
              alignSelf: 'stretch',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <ChevronDown
              size={16}
              style={{
                width: '16px',
                height: '16px',
                aspectRatio: '1/1',
                color: COLORS.lynch[700],
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
                pointerEvents: 'none',
                flexShrink: 0,
              }}
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: '#FFFFFF',
              border: `1px solid ${COLORS.lynch[200]}`,
              borderRadius: BORDER_RADIUS.md,
              boxShadow: `0px 4px 8px 0px ${COLORS.lynch[200]}`,
              padding: '8px',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 0,
              width: '100%',
            }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '4px 8px',
                    borderRadius: BORDER_RADIUS.base,
                    background: isSelected ? (variant === 'chart' ? COLORS.lynch[100] : COLORS.lynch[50]) : 'transparent',
                    cursor: 'pointer',
                    fontFamily: FONT_FAMILY.manrope,
                    fontSize: '13px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.09px',
                    color: isSelected ? COLORS.lynch[900] : COLORS.lynch[700],
                    transition: 'background-color 0.15s ease',
                    minHeight: '24px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = variant === 'chart' ? COLORS.lynch[100] : COLORS.lynch[50];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span
                    style={{
                      flex: '1 0 0',
                      minWidth: 0,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {option.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


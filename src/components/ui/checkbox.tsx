'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, disabled, className, style, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
        <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '4px',
            }}
          >
            <div
              onClick={() => {
                if (!disabled && props.onChange) {
                  const syntheticEvent = {
                    target: { checked: !props.checked },
                  } as React.ChangeEvent<HTMLInputElement>;
                  props.onChange(syntheticEvent);
                }
              }}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: theme.borderRadius.base,
                border: `1px solid ${
                  props.checked
                    ? theme.colors.primary[500]
                    : disabled
                    ? cssVar(CSS_VARS.neutral300)
                    : cssVar(CSS_VARS.borderMedium)
                }`,
                background: props.checked
                  ? theme.colors.primary[500]
                  : 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.2s ease',
                ...style,
              }}
              className={className}
            >
              {props.checked && (
                <Check size={12} style={{ color: cssVar(CSS_VARS.backgroundSecondary) }} />
              )}
            </div>
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              disabled={disabled}
              style={{ display: 'none' }}
              {...props}
            />
          </div>
          {label && (
            <label
              htmlFor={checkboxId}
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: theme.typography.text.small.size,
                fontWeight: theme.typography.weights.semibold.value,
                lineHeight: theme.typography.text.small.lineHeight,
                letterSpacing: '0.0897px',
                color: disabled
                  ? cssVar(CSS_VARS.textSecondary)
                  : cssVar(CSS_VARS.textPrimary),
                cursor: disabled ? 'not-allowed' : 'pointer',
                flex: 1,
              }}
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.small.size,
              fontWeight: theme.typography.weights.medium.value,
              lineHeight: '20px',
              color: theme.colors.error,
              margin: '4px 0 0 0',
              paddingLeft: '24px',
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';


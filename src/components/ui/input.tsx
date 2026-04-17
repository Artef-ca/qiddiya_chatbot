'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, required, disabled, className, style, ...props }, ref) => {
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
        {label && (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <label
              htmlFor={inputId}
              style={{
                fontFamily: 'Manrope, var(--font-manrope)',
                fontSize: theme.typography.text.small.size,
                fontWeight: theme.typography.weights.semibold.value,
                lineHeight: theme.typography.text.small.lineHeight,
                letterSpacing: '0.0897px',
                color: cssVar(CSS_VARS.textPrimary),
              }}
            >
              {label}
            </label>
            {required && (
              <span style={{ color: theme.colors.primary.DEFAULT, fontSize: '16px' }}>*</span>
            )}
          </div>
        )}
        <div
          style={{
            background: disabled
              ? cssVar(CSS_VARS.neutral50)
              : 'rgba(255, 255, 255, 0.8)',
            border: `1px solid ${
              error
                ? theme.colors.error
                : disabled
                ? cssVar(CSS_VARS.neutral200)
                : cssVar(CSS_VARS.border)
            }`,
            borderRadius: theme.borderRadius.md,
            padding: '10px 14px',
            boxShadow: `0px 1px 4px 0px ${cssVar(CSS_VARS.borderLight)}`,
            display: 'flex',
            gap: theme.spacing.sm,
            alignItems: 'center',
            ...style,
          }}
          className={className}
        >
          {icon && <div style={{ flexShrink: 0 }}>{icon}</div>}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.base.size,
              fontWeight: theme.typography.weights.regular.value,
              lineHeight: theme.typography.text.base.lineHeight,
              color: disabled
                ? cssVar(CSS_VARS.neutral400)
                : cssVar(CSS_VARS.textMuted),
              outline: 'none',
            }}
            {...props}
          />
        </div>
        {helperText && !error && (
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.small.size,
              fontWeight: theme.typography.weights.medium.value,
              lineHeight: theme.typography.text.small.lineHeight,
              letterSpacing: '0.0897px',
              color: cssVar(CSS_VARS.textSecondary),
              margin: 0,
            }}
          >
            {helperText}
          </p>
        )}
        {error && (
          <p
            style={{
              fontFamily: 'Manrope, var(--font-manrope)',
              fontSize: theme.typography.text.small.size,
              fontWeight: theme.typography.weights.medium.value,
              lineHeight: '20px',
              color: theme.colors.error,
              margin: 0,
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';


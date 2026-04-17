'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, required, disabled, className, style, ...props }, ref) => {
    const textareaId = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <label
              htmlFor={textareaId}
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
            {!required && (
              <span
                style={{
                  color: theme.colors.primary[700],
                  fontSize: theme.typography.text.small.size,
                  fontWeight: theme.typography.weights.medium.value,
                }}
              >
                (optional)
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          style={{
            minHeight: '120px',
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
            padding: '12px 14px',
            boxShadow: `0px 1px 4px 0px ${cssVar(CSS_VARS.borderLight)}`,
            fontFamily: 'Manrope, var(--font-manrope)',
            fontSize: theme.typography.text.base.size,
            fontWeight: theme.typography.weights.regular.value,
            lineHeight: theme.typography.text.base.lineHeight,
            color: disabled
              ? cssVar(CSS_VARS.neutral400)
              : cssVar(CSS_VARS.textMuted),
            resize: 'vertical',
            outline: 'none',
            ...style,
          }}
          className={className}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

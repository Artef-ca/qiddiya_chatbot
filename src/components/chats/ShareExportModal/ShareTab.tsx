'use client';

import { useState } from 'react';
import { Mail, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button-enhanced';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import type { ExportFormat } from './ShareExportModal';

interface ShareTabProps {
  emails: string;
  onEmailsChange: (emails: string) => void;
  message: string;
  onMessageChange: (message: string) => void;
  includeChatLink: boolean;
  onIncludeChatLinkChange: (include: boolean) => void;
  includeAttachment: boolean;
  onIncludeAttachmentChange: (include: boolean) => void;
  selectedFormat: ExportFormat | null;
  onSelectedFormatChange: (format: ExportFormat | null) => void;
  isDisabled: boolean;
  sendError: string | null;
  /** When false, Excel/CSV attachment formats are hidden (e.g. full chat share). */
  spreadsheetFormatsEnabled?: boolean;
}

export function ShareTab({
  emails,
  onEmailsChange,
  message,
  onMessageChange,
  includeChatLink,
  onIncludeChatLinkChange,
  includeAttachment,
  onIncludeAttachmentChange,
  selectedFormat,
  onSelectedFormatChange,
  isDisabled,
  sendError,
  spreadsheetFormatsEnabled = false,
}: ShareTabProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        width: '100%',
        minHeight: '340px',
      }}
    >
      {/* Email Input */}
      <Input
        label="Email(s)"
        required
        value={emails}
        onChange={(e) => onEmailsChange(e.target.value)}
        disabled={isDisabled}
        placeholder="Add email(s)"
        icon={<Mail size={20} style={{ color: cssVar(CSS_VARS.textSecondary) }} />}
        helperText="Separate multiple emails with commas"
      />

      {/* Message Textarea */}
      <Textarea
        label="Message"
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        disabled={isDisabled}
        placeholder="Enter a short message..."
      />

      {/* Checkboxes */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.sm,
          width: '100%',
        }}
      >
        {/* Include Chat Link */}
        <Checkbox
          id="include-chat-link"
          checked={includeChatLink}
          onChange={(e) => onIncludeChatLinkChange(e.target.checked)}
          disabled={isDisabled}
          label="Include chat link"
        />

        {/* Include Attachment */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Checkbox
            id="include-attachment"
            checked={includeAttachment}
            onChange={(e) => {
              onIncludeAttachmentChange(e.target.checked);
              if (!e.target.checked) {
                onSelectedFormatChange(null);
              } else {
                onSelectedFormatChange('PDF');
              }
            }}
            disabled={isDisabled}
            label="Include"
          />

          {/* Format Buttons */}
          {includeAttachment && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {(['Image', 'PDF', 'Excel', 'CSV', 'MD'] as ExportFormat[]).map((format) => {
                const spreadsheetBlocked =
                  !spreadsheetFormatsEnabled && (format === 'Excel' || format === 'CSV');
                const formatDisabled = isDisabled || spreadsheetBlocked;
                return (
                <button
                  key={format}
                  onClick={() => onSelectedFormatChange(format)}
                  disabled={formatDisabled}
                  style={{
                    display: 'flex',
                    gap: '3px',
                    alignItems: 'center',
                    padding: '4px 6px',
                    borderRadius: theme.borderRadius.base,
                    border: `1px solid ${
                      formatDisabled ? cssVar(CSS_VARS.neutral200) : cssVar(CSS_VARS.border)
                    }`,
                    background: formatDisabled
                      ? cssVar(CSS_VARS.neutral100)
                      : 'rgba(255, 255, 255, 0.2)',
                    cursor: formatDisabled ? 'not-allowed' : 'pointer',
                    opacity: formatDisabled ? 0.5 : 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Manrope, var(--font-manrope)',
                      fontSize: theme.typography.text.tiny.size,
                      fontWeight: theme.typography.weights.semibold.value,
                      lineHeight: '16px',
                      letterSpacing: '0.18px',
                      color: formatDisabled
                        ? cssVar(CSS_VARS.neutral400)
                        : cssVar(CSS_VARS.textSecondary),
                    }}
                  >
                    {format}
                  </span>
                  {selectedFormat === format && (
                    <Check size={12} style={{ color: '#4C9D4A' }} />
                  )}
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {sendError && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: theme.borderRadius.base,
            backgroundColor: '#FFF5F5',
            border: '1px solid #FFE5E5',
          }}
        >
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
            {sendError}
          </p>
        </div>
      )}
    </div>
  );
}


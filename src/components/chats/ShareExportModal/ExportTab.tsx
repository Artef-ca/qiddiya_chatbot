'use client';

import { useMemo } from 'react';
import { File } from 'lucide-react';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import { cssVar, CSS_VARS } from '@/lib/utils/css';
import type { ExportFormat } from './ShareExportModal';

interface ExportTabProps {
  exportingFormat: ExportFormat | null;
  onExport: (format: ExportFormat) => void;
  /** When false, Excel and CSV are omitted (full chat export UI). */
  spreadsheetFormatsEnabled?: boolean;
}

const exportFormats: ExportFormat[] = ['Image', 'PDF', 'Excel', 'CSV', 'MD'];

const formatColors: Record<ExportFormat, string> = {
  Image: '#DF0082', // Persian Rose-700
  PDF: '#D64933', // Punch-600
  Excel: '#52AA02', // Christi-600
  CSV: '#52AA02', // Christi-600
  MD: '#0093D4', // Picton Blue-500
};

const formatLabels: Record<ExportFormat, string> = {
  Image: 'PNG',
  PDF: 'PDF',
  Excel: 'XLS',
  CSV: 'CSV',
  MD: 'MD',
};

export function ExportTab({
  exportingFormat,
  onExport,
  spreadsheetFormatsEnabled = false,
}: ExportTabProps) {
  const formats = useMemo(
    () =>
      spreadsheetFormatsEnabled
        ? exportFormats
        : exportFormats.filter((f) => f !== 'Excel' && f !== 'CSV'),
    [spreadsheetFormatsEnabled]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        minHeight: '340px',
      }}
    >
      {formats.map((format) => {
        const isExportingThisFormat = exportingFormat === format;
        const isDisabledFormat = !!exportingFormat && !isExportingThisFormat;

        return (
          <div
            key={format}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <button
              onClick={() => onExport(format)}
              disabled={isDisabledFormat}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${
                  isDisabledFormat ? cssVar(CSS_VARS.neutral100) : '#DCD4FF'
                }`,
                background: isDisabledFormat
                  ? cssVar(CSS_VARS.neutral50)
                  : 'transparent',
                boxShadow: isDisabledFormat
                  ? 'none'
                  : '0px 1px 2px 0px rgba(236, 232, 255, 1)',
                cursor: isDisabledFormat ? 'not-allowed' : 'pointer',
                opacity: isDisabledFormat ? 0.5 : 1,
                width: '74px',
                height: '76px',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isDisabledFormat) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabledFormat) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Icon */}
              <div style={{ position: 'relative', width: '24px', height: '27px' }}>
                {isExportingThisFormat ? (
                  <div style={{ position: 'absolute', top: 0, left: 0 }}>
                    <Image
                      src="/animated-spinner.svg"
                      alt="Loading"
                      width={24}
                      height={24}
                      style={{ opacity: 0.8 }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '22px',
                      height: '27px',
                      position: 'relative',
                      marginLeft: '1px',
                      marginTop: '2px',
                    }}
                  >
                    {/* File icon */}
                    <File
                      size={20}
                      style={{
                        position: 'absolute',
                        top: 'calc(50% - 3.5px)',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        opacity: 0.8,
                        color: cssVar(CSS_VARS.textMuted),
                      }}
                    />
                    {/* File type label */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        width: '22px',
                        height: '8px',
                        background: formatColors[format],
                        borderRadius: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'Manrope, var(--font-manrope)',
                          fontSize: '8px',
                          fontWeight: 800,
                          lineHeight: '16px',
                          letterSpacing: '0.32px',
                          color: cssVar(CSS_VARS.backgroundSecondary),
                          textAlign: 'center',
                        }}
                      >
                        {formatLabels[format]}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: theme.typography.text.small.size,
                  fontWeight: theme.typography.weights.bold.value,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: isDisabledFormat
                    ? cssVar(CSS_VARS.neutral500)
                    : cssVar(CSS_VARS.textSecondary),
                  textAlign: 'center',
                }}
              >
                {format}
              </span>
            </button>
            {/* Exporting text */}
            {isExportingThisFormat && (
              <span
                style={{
                  fontFamily: 'Manrope, var(--font-manrope)',
                  fontSize: theme.typography.text.tiny.size,
                  fontWeight: theme.typography.weights.medium.value,
                  lineHeight: '16px',
                  letterSpacing: '0.18px',
                  color: cssVar(CSS_VARS.textMuted),
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                Exporting...
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}


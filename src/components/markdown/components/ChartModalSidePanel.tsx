'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Send, Check, File } from 'lucide-react';
import { useAppDispatch, useAppStore } from '@/store/hooks';
import { addToast, removeToast } from '@/store/slices/uiSlice';

export type ExportFormat = 'Image' | 'PDF' | 'Excel' | 'CSV' | 'MD';

const ALL_CHART_MODAL_EXPORT_FORMATS: ExportFormat[] = ['Image', 'PDF', 'Excel', 'CSV', 'MD'];

interface ChartModalSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'Share' | 'Export' | 'Copy';
  modalHeight: number;
  modalTop: number;
  modalLeft: number;
  onShare?: (emails: string, message: string, formats: ExportFormat[]) => void;
  onExport?: (format: ExportFormat) => void;
  onCopy?: () => void;
  contentTitle?: string;
  isInsideModal?: boolean; // Flag to indicate if panel is inside modal
  tableChartContent?: { type: 'table' | 'chart'; content: string; title?: string } | null;
  chatId?: string;
}

export function ChartModalSidePanel({
  isOpen,
  onClose,
  type,
  modalHeight,
  modalTop,
  modalLeft,
  onShare,
  onExport,
  onCopy,
  contentTitle = 'Table',
  isInsideModal = false,
  tableChartContent = null,
  chatId = '',
}: ChartModalSidePanelProps) {
  const isShareDisabled = Boolean(tableChartContent);
  const [activeTab, setActiveTab] = useState<'Share' | 'Export' | 'Copy'>(type);
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(['PDF']);
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat | null>(null);
  const [selectedCopyFormat, setSelectedCopyFormat] = useState<'Text' | 'Markdown' | 'CSV' | 'JSON' | 'Image' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const dispatch = useAppDispatch();
  const store = useAppStore();

  // Update active tab when type prop changes
  useEffect(() => {
    if (isShareDisabled && type === 'Share') {
      setActiveTab('Export');
      return;
    }
    setActiveTab(type);
  }, [type, isShareDisabled]);

  // Reset form when panel closes
  useEffect(() => {
    if (!isOpen) {
      setEmails('');
      setMessage('');
      setIncludeAttachments(true);
      setSelectedFormats(['PDF']);
      setSelectedExportFormat(null);
      setSelectedCopyFormat(null);
    }
  }, [isOpen]);

  const formatOptions = useMemo(
    () =>
      tableChartContent?.type === 'table'
        ? ALL_CHART_MODAL_EXPORT_FORMATS
        : ALL_CHART_MODAL_EXPORT_FORMATS.filter((f) => f !== 'Excel' && f !== 'CSV'),
    [tableChartContent?.type]
  );

  const copyFormatOptions = useMemo(() => {
    const all = ['Image', 'Text', 'Markdown', 'CSV', 'JSON'] as const;
    if (tableChartContent?.type === 'table') return [...all];
    return all.filter((f) => f !== 'CSV');
  }, [tableChartContent?.type]);

  useEffect(() => {
    if (tableChartContent?.type === 'table') return;
    setSelectedExportFormat((prev) =>
      prev === 'Excel' || prev === 'CSV' ? 'PDF' : prev
    );
    setSelectedFormats((prev) => prev.filter((f) => f !== 'Excel' && f !== 'CSV'));
    setSelectedCopyFormat((prev) => (prev === 'CSV' ? null : prev));
  }, [tableChartContent?.type]);

  const handleFormatToggle = (format: ExportFormat) => {
    if (selectedFormats.includes(format)) {
      setSelectedFormats(selectedFormats.filter((f) => f !== format));
    } else {
      setSelectedFormats([...selectedFormats, format]);
    }
  };

  const handleShare = () => {
    if (onShare && emails.trim()) {
      onShare(emails, message, selectedFormats);
      onClose();
    }
  };

  const handleExport = async () => {
    if (!tableChartContent || !chatId || !selectedExportFormat) {
      // Fallback to original handler if content not available or no format selected
      if (onExport && selectedExportFormat) {
        onExport(selectedExportFormat);
        onClose();
      }
      return;
    }

    setIsExporting(true);
    const exportTitle = tableChartContent.title || contentTitle;
    const formatName = selectedExportFormat === 'Image' ? 'PNG' : selectedExportFormat;
    
    // Show generating notification
    const generatingMessage = `Generating ${formatName}...`;
    dispatch(
      addToast({
        message: generatingMessage,
        type: 'info',
        duration: 0,
      })
    );

    try {
      const tableChartParam = `&tableChartContent=${encodeURIComponent(JSON.stringify(tableChartContent))}`;
      let downloadUrl: string;
      let filename: string;

      switch (selectedExportFormat) {
        case 'PDF':
          downloadUrl = `/api/export-chat?format=pdf&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          filename = `${exportTitle}.pdf`;
          break;
        case 'Image':
          downloadUrl = `/api/export-chat?format=image&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          filename = `${exportTitle}.png`;
          break;
        case 'Excel':
          downloadUrl = `/api/export-chat?format=excel&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          filename = `${exportTitle}.xlsx`;
          break;
        case 'CSV':
          downloadUrl = `/api/export-chat?format=csv&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          filename = `${exportTitle}.csv`;
          break;
        case 'MD':
          downloadUrl = `/api/export-chat?format=md&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          filename = `${exportTitle}.md`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to generate file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Remove generating toast - get current state directly from store
      const currentToasts = store.getState().ui.toasts;
      const generatingToast = currentToasts.find(
        (t) => t.type === 'info' && t.message === generatingMessage
      );
      if (generatingToast) {
        dispatch(removeToast(generatingToast.id));
      }

      // Show success notification
      dispatch(
        addToast({
          message: `${formatName} exported successfully`,
          type: 'success',
          duration: 5000,
        })
      );

      onClose();
    } catch (error) {
      // Remove generating toast - get current state directly from store
      const currentToasts = store.getState().ui.toasts;
      const generatingToast = currentToasts.find(
        (t) => t.type === 'info' && t.message === generatingMessage
      );
      if (generatingToast) {
        dispatch(removeToast(generatingToast.id));
      }

      // Show error notification
      dispatch(
        addToast({
          message: error instanceof Error ? error.message : 'Failed to export',
          type: 'error',
          duration: 5000,
        })
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!tableChartContent || !chatId) {
      // Fallback to original handler if content not available
      if (onCopy) {
        onCopy();
        onClose();
      }
      return;
    }

    if (!selectedCopyFormat) {
      return;
    }

    setIsCopying(true);
    const exportTitle = tableChartContent.title || contentTitle;
    const formatName = selectedCopyFormat === 'Image' ? 'PNG' : selectedCopyFormat;
    
    // Show generating notification
    const generatingMessage = `Generating ${formatName}...`;
    dispatch(
      addToast({
        message: generatingMessage,
        type: 'info',
        duration: 0,
      })
    );

    try {
      const tableChartParam = `&tableChartContent=${encodeURIComponent(JSON.stringify(tableChartContent))}`;
      let downloadUrl: string;

      switch (selectedCopyFormat) {
        case 'Text':
          downloadUrl = `/api/export-chat?format=text&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          break;
        case 'Markdown':
          downloadUrl = `/api/export-chat?format=md&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          break;
        case 'CSV':
          downloadUrl = `/api/export-chat?format=csv&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          break;
        case 'JSON':
          // For JSON, we need to handle it differently - export as JSON format
          downloadUrl = `/api/export-chat?format=json&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          break;
        case 'Image':
          downloadUrl = `/api/export-chat?format=image&chatId=${chatId}&title=${encodeURIComponent(exportTitle)}${tableChartParam}`;
          break;
        default:
          throw new Error('Unsupported copy format');
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to generate file');
      }

      const blob = await response.blob();

      // Copy to clipboard
      if (selectedCopyFormat === 'Image') {
        // For images, copy the blob directly
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
      } else {
        // For text-based formats (Text, Markdown, CSV, JSON), convert to text and copy
        const text = await blob.text();
        await navigator.clipboard.writeText(text);
      }

      // Remove generating toast - get current state directly from store
      const currentToasts = store.getState().ui.toasts;
      const generatingToast = currentToasts.find(
        (t) => t.type === 'info' && t.message === generatingMessage
      );
      if (generatingToast) {
        dispatch(removeToast(generatingToast.id));
      }

      // Show success notification
      dispatch(
        addToast({
          message: `${formatName} copied to clipboard`,
          type: 'success',
          duration: 5000,
        })
      );

      onClose();
    } catch (error) {
      // Remove generating toast - get current state directly from store
      const currentToasts = store.getState().ui.toasts;
      const generatingToast = currentToasts.find(
        (t) => t.type === 'info' && t.message === generatingMessage
      );
      if (generatingToast) {
        dispatch(removeToast(generatingToast.id));
      }

      // Show error notification
      dispatch(
        addToast({
          message: error instanceof Error ? error.message : 'Failed to copy',
          type: 'error',
          duration: 5000,
        })
      );
    } finally {
      setIsCopying(false);
    }
  };

  if (!isOpen) return null;

  // If inside modal, use relative positioning; otherwise use fixed
  const containerStyle: React.CSSProperties = isInsideModal
    ? {
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInFromRight 0.3s ease-in-out',
      }
    : {
        position: 'fixed',
        top: modalTop,
        left: modalLeft + 1024, // Position to the right of modal
        width: '500px',
        height: `${modalHeight}px`,
        zIndex: 10001,
        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(90deg, rgba(246, 247, 249, 1) 0%, rgba(246, 247, 249, 1) 100%)',
        borderLeft: '1px solid var(--Lynch-200, #D5D9E2)',
        boxShadow: '0px 1px 4px 0px var(--Lynch-100, #ECEEF2)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInFromRight 0.3s ease-in-out',
      };

  return (
    <>
      {!isInsideModal && (
        <style>{`
          @keyframes slideInFromRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>
      )}
      <div
        style={containerStyle}
        onClick={(e) => e.stopPropagation()}
      >

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 32px 32px 32px',
          height: '100%',
        //   gap: '32px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            paddingTop: '4px',
          }}
        >
          <div
            style={{
              flex: '1 0 0',
              height: '42px',
              paddingBottom: '8px',
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            <h4
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                lineHeight: '24px',
                letterSpacing: '-0.0594px',
                color: 'var(--Lynch-800, #3A4252)',
                margin: 0,
              }}
            >
              Options
            </h4>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
            title="Close"
            aria-label="Close"
          >
            <X size={16} style={{ color: 'var(--Lynch-800, #3A4252)' }} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            paddingBottom: '16px',
          }}
        >
          <button
            onClick={() => {
              if (!isShareDisabled) setActiveTab('Share');
            }}
            disabled={isShareDisabled}
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '13px',
              fontWeight: activeTab === 'Share' ? 700 : 600,
              lineHeight: '24px',
              letterSpacing: '0.0897px',
              color: activeTab === 'Share' ? 'var(--Lynch-800, #3A4252)' : 'var(--Lynch-700, #434E61)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'Share' ? '2px solid var(--Lynch-700, #434E61)' : 'none',
              padding: '0 4px 12px',
              cursor: isShareDisabled ? 'not-allowed' : 'pointer',
              opacity: isShareDisabled ? 0.5 : 1,
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Share
          </button>
          <button
            onClick={() => setActiveTab('Export')}
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '13px',
              fontWeight: activeTab === 'Export' ? 700 : 600,
              lineHeight: '24px',
              letterSpacing: '0.0897px',
              color: activeTab === 'Export' ? 'var(--Lynch-800, #3A4252)' : 'var(--Lynch-700, #434E61)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'Export' ? '2px solid var(--Lynch-700, #434E61)' : 'none',
              padding: '0 4px 12px',
              cursor: 'pointer',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Export
          </button>
          <button
            onClick={() => setActiveTab('Copy')}
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: '13px',
              fontWeight: activeTab === 'Copy' ? 700 : 600,
              lineHeight: '24px',
              letterSpacing: '0.0897px',
              color: activeTab === 'Copy' ? 'var(--Lynch-800, #3A4252)' : 'var(--Lynch-700, #434E61)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'Copy' ? '2px solid var(--Lynch-700, #434E61)' : 'none',
              padding: '0 4px 12px',
              cursor: 'pointer',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Copy
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: '1 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {activeTab === 'Share' && (
            <>
              {/* Email Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <label
                    style={{
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '13px',
                      fontWeight: 600,
                      lineHeight: '24px',
                      letterSpacing: '0.0897px',
                      color: 'var(--Lynch-900, #343A46)',
                    }}
                  >
                    Email(s)
                  </label>
                  <span style={{ color: 'var(--Electric-Violet-600, #7122F4)', fontSize: '16px' }}>*</span>
                </div>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid var(--Lynch-200, #D5D9E2)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxShadow: '0px 1px 4px 0px var(--Lynch-100, #ECEEF2)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <Mail size={20} style={{ color: '#64748B', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    placeholder="Add email(s)"
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '16px',
                      fontWeight: 400,
                      lineHeight: '24px',
                      color: 'var(--Lynch-700, #434E61)',
                      outline: 'none',
                    }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: 'var(--Lynch-500, #64748B)',
                    margin: 0,
                  }}
                >
                  Separate multiple emails with commas
                </p>
              </div>

              {/* Message Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <label
                    style={{
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '13px',
                      fontWeight: 600,
                      lineHeight: '24px',
                      letterSpacing: '0.0897px',
                      color: 'var(--Lynch-900, #343A46)',
                    }}
                  >
                    Message
                  </label>
                  <span style={{ color: '#7F56D9', fontSize: '13px', fontWeight: 500 }}>(optional)</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter a short message..."
                  rows={2}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid var(--Lynch-200, #D5D9E2)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    boxShadow: '0px 1px 4px 0px var(--Lynch-100, #ECEEF2)',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '16px',
                    fontWeight: 400,
                    lineHeight: '24px',
                    color: 'var(--Lynch-700, #434E61)',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '80px',
                  }}
                />
              </div>

              {/* Include Attachments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '24px' }}>
                    <input
                      type="checkbox"
                      checked={includeAttachments}
                      onChange={(e) => setIncludeAttachments(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: 'var(--Electric-Violet-500, #8955FD)',
                      }}
                    />
                    <label
                      style={{
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: '13px',
                        fontWeight: 600,
                        lineHeight: '24px',
                        letterSpacing: '0.0897px',
                        color: 'var(--Lynch-700, #434E61)',
                        cursor: 'pointer',
                      }}
                    >
                      Include
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {formatOptions.map((format) => (
                      <div
                        key={format}
                        onClick={() => handleFormatToggle(format)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: '1px solid var(--Lynch-200, #D5D9E2)',
                          borderRadius: '4px',
                          padding: '4px 6px 4px 6px',
                          display: 'flex',
                          gap: '3px',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'Manrope, sans-serif',
                            fontSize: '10px',
                            fontWeight: 600,
                            lineHeight: '16px',
                            letterSpacing: '0.18px',
                            color: 'var(--Lynch-600, #526077)',
                          }}
                        >
                          {format}
                        </span>
                        {selectedFormats.includes(format) && (
                          <Check size={12} style={{ color: '#4C9D4A' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Export Format Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: 'var(--Lynch-900, #343A46)',
                  }}
                >
                  Export Format
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {formatOptions.map((format) => {
                    const isSelected = selectedExportFormat === format;
                    
                    // File type colors matching ShareExportModal
                    const getFileTypeColor = (format: ExportFormat) => {
                      switch (format) {
                        case 'Image':
                          return '#DF0082'; // Persian Rose-700
                        case 'PDF':
                          return '#D64933'; // Punch-600
                        case 'Excel':
                        case 'CSV':
                          return '#52AA02'; // Christi-600
                        case 'MD':
                          return '#0093D4'; // Picton Blue-500
                        default:
                          return '#526077';
                      }
                    };
                    
                    return (
                      <button
                        key={format}
                        onClick={() => setSelectedExportFormat(format as ExportFormat)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px',
                          borderRadius: '8px',
                          border: isSelected
                            ? '1px solid #C3B2FF' // Electric Violet-300
                            : '1px solid #DCD4FF', // Electric Violet-200
                          background: isSelected
                            ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.50) 100%), #F5F2FF' // White overlay + Electric Violet-50
                            : 'transparent',
                          boxShadow: isSelected
                            ? '0px 1px 2px 0px rgba(220, 212, 255, 1)' // shadow-main-200-xs
                            : '0px 1px 2px 0px rgba(236, 232, 255, 1)', // shadow-main-100-xs
                          cursor: 'pointer',
                          width: '74px',
                          height: '76px',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {/* Icon */}
                        <div style={{ position: 'relative', width: '24px', height: '27px' }}>
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
                                color: '#8695AA',
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
                                background: getFileTypeColor(format),
                                borderRadius: '1px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'Manrope, sans-serif',
                                  fontSize: '8px',
                                  fontWeight: 800,
                                  lineHeight: '16px',
                                  letterSpacing: '0.32px',
                                  color: '#F6F7F9',
                                  textAlign: 'center',
                                }}
                              >
                                {format === 'Image'
                                  ? 'PNG'
                                  : format === 'Excel'
                                  ? 'XLS'
                                  : format}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Label */}
                        <span
                          style={{
                            fontFamily: 'Manrope, sans-serif',
                            fontSize: '13px',
                            fontWeight: 700,
                            lineHeight: '24px',
                            letterSpacing: '0.0897px',
                            color: '#526077',
                            textAlign: 'center',
                          }}
                        >
                          {format}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Copy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Copy Format Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '24px',
                    letterSpacing: '0.0897px',
                    color: 'var(--Lynch-900, #343A46)',
                  }}
                >
                  Copy Format
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {copyFormatOptions.map((format) => {
                    const isSelected = selectedCopyFormat === format;
                    
                    // File type colors matching CopyAsModal
                    const getFileTypeColor = (format: string) => {
                      switch (format) {
                        case 'Image':
                          return '#DF0082'; // Persian Rose-700 (same as Export tab)
                        case 'Text':
                          return '#D64933'; // Punch-600
                        case 'Markdown':
                          return '#0093D4'; // Picton Blue-500
                        case 'CSV':
                          return '#52AA02'; // Christi-600
                        case 'JSON':
                          return '#DF0082'; // Persian Rose-700
                        default:
                          return '#526077';
                      }
                    };
                    
                    return (
                      <button
                        key={format}
                        onClick={() => setSelectedCopyFormat(format)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px',
                          borderRadius: '8px',
                          border: isSelected
                            ? '1px solid #C3B2FF' // Electric Violet-300
                            : '1px solid #DCD4FF', // Electric Violet-200
                          background: isSelected
                            ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.50) 100%), #F5F2FF' // White overlay + Electric Violet-50
                            : 'transparent',
                          boxShadow: isSelected
                            ? '0px 1px 2px 0px rgba(220, 212, 255, 1)' // shadow-main-200-xs
                            : '0px 1px 2px 0px rgba(236, 232, 255, 1)', // shadow-main-100-xs
                          cursor: 'pointer',
                          width: '74px',
                          height: '76px',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {/* Icon */}
                        <div style={{ position: 'relative', width: '24px', height: '27px' }}>
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
                                color: '#8695AA',
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
                                background: getFileTypeColor(format),
                                borderRadius: '1px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'Manrope, sans-serif',
                                  fontSize: '8px',
                                  fontWeight: 800,
                                  lineHeight: '16px',
                                  letterSpacing: '0.32px',
                                  color: '#F6F7F9',
                                  textAlign: 'center',
                                }}
                              >
                                {format === 'Text'
                                  ? 'TXT'
                                  : format === 'Markdown'
                                  ? 'MD'
                                  : format === 'CSV'
                                  ? 'CSV'
                                  : format === 'JSON'
                                  ? 'JSON'
                                  : format === 'Image'
                                  ? 'PNG'
                                  : format}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Label */}
                        <span
                          style={{
                            fontFamily: 'Manrope, sans-serif',
                            fontSize: '13px',
                            fontWeight: 700,
                            lineHeight: '24px',
                            letterSpacing: '0.0897px',
                            color: '#526077',
                            textAlign: 'center',
                          }}
                        >
                          {format}
                        </span>

                        {/* Checkmark badge for selected state */}
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '-8px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'linear-gradient(0deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.50) 100%), #F5F2FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #C3B2FF', // Electric Violet-300
                              boxShadow: '0px 1px 2px 0px rgba(220, 212, 255, 1)',
                            }}
                          >
                            <Check
                              size={12}
                              color="#4C9D4A" // De-York-500 (green)
                              strokeWidth={2.5}
                              style={{
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                              }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '16px',
            paddingTop: '32px',
            // borderTop: '1px solid var(--Lynch-200, #D5D9E2)',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: '24px',
                letterSpacing: '0.0897px',
                color: 'var(--Lynch-700, #434E61)',
                background: 'transparent',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
              }}
            >
              Close
            </button>
            {activeTab === 'Share' && (
              <button
                onClick={handleShare}
                disabled={!emails.trim()}
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: 'var(--Electric-Violet-50, #F5F2FF)',
                  background: 'var(--Electric-Violet-600, #7122F4)',
                  border: '1px solid var(--Electric-Violet-600, #7122F4)',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: emails.trim() ? 'pointer' : 'not-allowed',
                  opacity: emails.trim() ? 1 : 0.5,
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                }}
              >
                <Send size={16} />
                Send
              </button>
            )}
            {activeTab === 'Export' && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: (isExporting || !selectedExportFormat) ? '#84848C' : 'var(--Electric-Violet-50, #F5F2FF)',
                  background: (isExporting || !selectedExportFormat) ? '#E6E6E7' : 'var(--Electric-Violet-600, #7122F4)',
                  border: `1px solid ${(isExporting || !selectedExportFormat) ? '#CFCFD2' : 'var(--Electric-Violet-600, #7122F4)'}`,
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: (isExporting || !selectedExportFormat) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  boxShadow: (isExporting || !selectedExportFormat) ? 'none' : '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                  opacity: (isExporting || !selectedExportFormat) ? 0.7 : 1,
                }}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            )}
            {activeTab === 'Copy' && (
              <button
                onClick={handleCopy}
                disabled={isCopying || !selectedCopyFormat}
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  lineHeight: '24px',
                  letterSpacing: '0.0897px',
                  color: (isCopying || !selectedCopyFormat) ? '#84848C' : 'var(--Electric-Violet-50, #F5F2FF)',
                  background: (isCopying || !selectedCopyFormat) ? '#E6E6E7' : 'var(--Electric-Violet-600, #7122F4)',
                  border: `1px solid ${(isCopying || !selectedCopyFormat) ? '#CFCFD2' : 'var(--Electric-Violet-600, #7122F4)'}`,
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: (isCopying || !selectedCopyFormat) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center',
                  boxShadow: (isCopying || !selectedCopyFormat) ? 'none' : '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
                  opacity: (isCopying || !selectedCopyFormat) ? 0.7 : 1,
                }}
              >
                {isCopying ? 'Copying...' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}


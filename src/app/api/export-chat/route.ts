import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { mockConversations } from '@/data/mockConversations';
import { formatMessageContentForDisplay } from '@/lib/utils/formatMessageContent';
import { htmlAndMarkdownToPlainText } from '@/lib/utils/textExtraction';
import * as XLSX from 'xlsx';

type DataPoint = Record<string, unknown>;
type ExportMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  is_pro?: boolean;
};
type ExportConversation = {
  id: string;
  title: string;
  messages: ExportMessage[];
};
type TableChartContent = { type: 'table' | 'chart'; content: string; title?: string };

/**
 * Normalize message content for export so it matches the UI (formatted text, not raw JSON).
 * Parses raw event JSON (e.g. {"role":"user","parts":[{"text":"Hello"}]}) into display text.
 */
function normalizeConversationForExport(conversation: {
  id: string;
  title: string;
  messages: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: string }>;
}): typeof conversation {
  return {
    ...conversation,
    messages: conversation.messages.map((msg) => ({
      ...msg,
      content: formatMessageContentForDisplay(msg.content),
    })),
  };
}

// Helper function to get conversation data
// First tries to fetch from API, then falls back to mock data
async function getConversationData(chatId: string, baseUrl?: string): Promise<ExportConversation | null> {
  try {
    // IMPORTANT: For server-side exports, we should prioritize mock data for existing conversations
    // The in-memory store is only for newly created conversations that aren't in mock data yet
    // This prevents issues where the store might have stale or incorrect data

    // First, check mock data (this is the source of truth for existing conversations)
    const mockConversation = mockConversations.find(c => c.id === chatId);

    if (mockConversation) {
      // Found in mock data - use it (this is the correct conversation)
      console.log(`[Export] Using mock data for conversation ${chatId}`);
      return {
        id: mockConversation.id,
        title: mockConversation.title,
        messages: mockConversation.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          is_pro: (msg as { is_pro?: boolean }).is_pro,
        })),
      };
    }

    // If not in mock data, try the API route's store (for newly created conversations)
    // Note: Server-side fetches won't be intercepted by MSW, so they'll hit the actual API route
    if (baseUrl) {
      try {
        const apiUrl = `${baseUrl}/api/conversations/${chatId}`;
        console.log(`[Export] Fetching conversation ${chatId} from API route`);
        const response = await fetch(apiUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
          // Add cache control to ensure we get fresh data
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Export] Retrieved conversation ${chatId} from API route, has ${data.messages?.length || 0} messages`);

          // Validate that the returned data matches the requested chatId
          if (data.id && data.id !== chatId) {
            console.warn(`[Export] API returned conversation with ID ${data.id} but requested ${chatId}. Using requested ID.`);
          }

          // API returns serialized dates, so we can use them directly
          return {
            id: chatId, // Always use the requested chatId to ensure consistency
            title: data.title,
            messages: (data.messages || []).map((msg: DataPoint) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp, // Already ISO string from API
              is_pro: msg.is_pro,
            })),
          };
        } else if (response.status === 404) {
          // Conversation not found in API, log and return null
          console.log(`[Export] Conversation ${chatId} not found in API route`);
        }
      } catch (apiError) {
        // API fetch failed, log and continue
        console.log(`[Export] API fetch failed for conversation ${chatId}:`, apiError);
      }
    }

    // If we get here, conversation was not found in mock data or API
    console.error(`[Export] Conversation ${chatId} not found in mock data or API`);
    return null;
  } catch (error) {
    console.error(`[Export] Error getting conversation ${chatId}:`, error);
    return null;
  }
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Convert HTML/markdown to plain text for export (no <div> etc.; lists as bullets, tables as text)
function markdownToPlainText(content: string): string {
  return htmlAndMarkdownToPlainText(content);
}

/** Split a markdown pipe table row into trimmed cells (supports leading/trailing `|`). */
function splitMarkdownTableRow(line: string): string[] {
  const t = line.trim();
  if (!t.includes('|')) return [];
  const core = t.startsWith('|') ? t.slice(1) : t;
  const endTrimmed = core.endsWith('|') ? core.slice(0, -1) : core;
  return endTrimmed.split('|').map((c) => c.trim());
}

function isMarkdownTableSeparatorRow(line: string): boolean {
  const cells = splitMarkdownTableRow(line).filter((c) => c.length > 0);
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

/** Parse a markdown pipe table into a matrix (header + body rows). */
function parseMarkdownTableToMatrix(markdown: string): string[][] | null {
  const lines = markdown
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  const header = splitMarkdownTableRow(lines[0]);
  if (header.length === 0) return null;

  let rest = lines.slice(1);
  if (rest.length > 0 && isMarkdownTableSeparatorRow(rest[0])) {
    rest = rest.slice(1);
  }

  const body = rest
    .map(splitMarkdownTableRow)
    .filter((row) => row.some((c) => c.length > 0));

  return [header, ...body];
}

function escapeCsvCell(val: string): string {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function matrixToCsv(matrix: string[][]): string {
  return matrix.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\r\n');
}

/** Real .xlsx (Office Open XML) so Excel does not warn about extension vs content. */
function matrixToXlsxBuffer(matrix: string[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// Helper function to render table from batch2-response data
function renderTableFromData(block: { headers?: unknown[]; rows?: unknown[][] }): string {
  if (!block.headers || !block.rows) {
    return '';
  }

  const headers = block.headers.map((h) => `<th style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; text-align: left;">${escapeHtml(String(h))}</th>`).join('');
  const rows = block.rows.map((row: unknown[]) => {
    const cells = row.map((cell: unknown) => {
      const cellText = String(cell || '');
      // Check if it's a status label
      const normalizedText = cellText.toLowerCase().trim();
      let statusClass = '';
      if (normalizedText.includes('positive') || normalizedText === 'positive label') {
        statusClass = 'background: #E8F5E9; color: #2E7D32;';
      } else if (normalizedText.includes('negative') || normalizedText === 'negative label') {
        statusClass = 'background: #FFEBEE; color: #C62828;';
      } else if (normalizedText.includes('warning') || normalizedText === 'warning label') {
        statusClass = 'background: #FFF3E0; color: #E65100;';
      }
      const displayText = normalizedText.includes('label')
        ? (normalizedText.includes('positive') ? 'Positive Label' :
          normalizedText.includes('negative') ? 'Negative Label' :
            normalizedText.includes('warning') ? 'Warning Label' : cellText)
        : cellText;
      return `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; ${statusClass}">${escapeHtml(displayText)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div style="margin: 16px 0; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; font-family: 'Manrope', sans-serif;">
        <thead>
          <tr>${headers}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// Helper function to render chart as SVG visualization
function renderChartAsSVG(block: { title?: string; subtitle?: string; chartType?: string; data?: DataPoint[]; selectedTimePeriodLabel?: string }): string {
  if (!block.data || !Array.isArray(block.data) || block.data.length === 0) {
    return '';
  }
  const chartData = block.data;

  const title = block.title ? `<h3 style="font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 600; margin: 16px 0 8px 0; color: #111827;">${escapeHtml(block.title)}</h3>` : '';
  const subtitle = block.subtitle ? `<p style="font-family: 'Manrope', sans-serif; font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">${escapeHtml(block.subtitle)}</p>` : '';

  const chartType = block.chartType || 'bar';
  const selectedTimePeriodLabel = block.selectedTimePeriodLabel || 'All Data';
  const width = 700;
  const height = 300;
  const padding = { top: 40, right: 40, bottom: 90, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Extract data keys (excluding 'name')
  const allKeys = new Set<string>();
  block.data.forEach((item: DataPoint) => {
    Object.keys(item).forEach(key => {
      if (key !== 'name') allKeys.add(key);
    });
  });
  const dataKeys = Array.from(allKeys);

  if (dataKeys.length === 0) {
    return '';
  }

  // Get numeric values for scaling
  const allValues: number[] = [];
  block.data.forEach((item: DataPoint) => {
    dataKeys.forEach(key => {
      const val = item[key];
      const numVal = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      if (!isNaN(numVal)) allValues.push(numVal);
    });
  });

  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);

  // Default colors
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  let svgContent = '';

  if (chartType === 'bar' || chartType === 'line' || chartType === 'area') {
    // Reserve a right column for legend so it cannot overlap chart bars/points.
    const legendColumnWidth = 160;
    const plotWidth = chartWidth - legendColumnWidth;
    const barWidth = plotWidth / (chartData.length * (dataKeys.length + 0.5));
    const xScale = plotWidth / chartData.length;

    // Draw axes
    svgContent += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#e5e7eb" stroke-width="2"/>`;
    svgContent += `<line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + chartHeight}" stroke="#e5e7eb" stroke-width="2"/>`;

    // Draw grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      const value = maxValue - (maxValue / 5) * i;
      svgContent += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + plotWidth}" y2="${y}" stroke="#f3f4f6" stroke-width="1" stroke-dasharray="2,2"/>`;
      svgContent += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-family="Manrope" font-size="12" fill="#6b7280">${Math.round(value)}</text>`;
    }

    const getXAxisLabelEntries = () => {
      const maxVisibleLabels = 8;
      const step = Math.max(1, Math.ceil(chartData.length / maxVisibleLabels));
      return chartData
        .map((item: DataPoint, index: number) => ({ item, index }))
        .filter(({ index }) => index % step === 0 || index === chartData.length - 1);
    };

    const renderXAxisLabel = (x: number, itemName: string) => {
      const sanitizedLabel = escapeHtml(String(itemName).substring(0, 12));
      return `<text x="${x}" y="${padding.top + chartHeight + 24}" text-anchor="end" transform="rotate(-35 ${x} ${padding.top + chartHeight + 24})" font-family="Manrope" font-size="10" fill="#6b7280">${sanitizedLabel}</text>`;
    };

    if (chartType === 'area') {
      // Area chart - render as stacked areas for each dataKey
      dataKeys.forEach((key, keyIndex) => {
        const color = colors[keyIndex % colors.length];
        const pathPoints: string[] = [];
        const linePoints: string[] = [];

        // Build path from bottom-left, through data points, to bottom-right
        chartData.forEach((item: DataPoint, index: number) => {
          const x = padding.left + (index + 0.5) * xScale;
          const value = typeof item[key] === 'number' ? item[key] : parseFloat(String(item[key])) || 0;
          const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          const pointY = padding.top + chartHeight - normalizedValue;

          if (index === 0) {
            // Start path at bottom-left
            pathPoints.push(`M ${x} ${padding.top + chartHeight}`);
            linePoints.push(`M ${x} ${pointY}`);
          }

          pathPoints.push(`L ${x} ${pointY}`);
          linePoints.push(`L ${x} ${pointY}`);

          if (index === chartData.length - 1) {
            // End path at bottom-right
            pathPoints.push(`L ${x} ${padding.top + chartHeight} Z`);
          }
        });

        // Draw filled area
        svgContent += `<path d="${pathPoints.join(' ')}" fill="${color}" opacity="0.4" stroke="none"/>`;
        // Draw line on top
        svgContent += `<path d="${linePoints.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;

        // Draw data points
        chartData.forEach((item: DataPoint, index: number) => {
          const x = padding.left + (index + 0.5) * xScale;
          const value = typeof item[key] === 'number' ? item[key] : parseFloat(String(item[key])) || 0;
          const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          const pointY = padding.top + chartHeight - normalizedValue;
          svgContent += `<circle cx="${x}" cy="${pointY}" r="4" fill="${color}"/>`;
        });
      });

      // X-axis labels (downsampled + rotated to avoid overlap)
      getXAxisLabelEntries().forEach(({ item, index }) => {
        const x = padding.left + (index + 0.5) * xScale;
        const itemName = item.name || String(item[Object.keys(item)[0]] || '');
        svgContent += renderXAxisLabel(x, String(itemName));
      });
    } else {
      // Bar and Line charts
      chartData.forEach((item: DataPoint, index: number) => {
        const x = padding.left + (index + 0.5) * xScale;

        dataKeys.forEach((key, keyIndex) => {
          const value = typeof item[key] === 'number' ? item[key] : parseFloat(String(item[key])) || 0;
          const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
          const barHeight = normalizedValue;
          const color = colors[keyIndex % colors.length];

          if (chartType === 'bar') {
            const barX = x - (barWidth * dataKeys.length) / 2 + (keyIndex * barWidth);
            svgContent += `<rect x="${barX}" y="${padding.top + chartHeight - barHeight}" width="${barWidth * 0.8}" height="${barHeight}" fill="${color}" opacity="0.8"/>`;
          } else if (chartType === 'line') {
            const pointY = padding.top + chartHeight - barHeight;
            if (index > 0) {
              const prevItem = chartData[index - 1];
              let prevValue: number;
              if (typeof prevItem[key] === 'number') {
                prevValue = prevItem[key] as number;
              } else {
                prevValue = parseFloat(String(prevItem[key])) || 0;
              }
              const prevNormalized = ((prevValue - minValue) / (maxValue - minValue || 1)) * chartHeight;
              const prevX = padding.left + (index - 0.5) * xScale;
              const prevY = padding.top + chartHeight - prevNormalized;
              svgContent += `<line x1="${prevX}" y1="${prevY}" x2="${x}" y2="${pointY}" stroke="${color}" stroke-width="2" fill="none"/>`;
            }
            svgContent += `<circle cx="${x}" cy="${pointY}" r="4" fill="${color}"/>`;
          }
        });

      });

      // X-axis labels (downsampled + rotated to avoid overlap)
      getXAxisLabelEntries().forEach(({ item, index }) => {
        const x = padding.left + (index + 0.5) * xScale;
        const itemName = item.name || String(item[Object.keys(item)[0]] || '');
        svgContent += renderXAxisLabel(x, String(itemName));
      });
    }

    // Legend
    const legendX = padding.left + plotWidth + 20;
    dataKeys.forEach((key, index) => {
      const y = padding.top + (index * 20);
      svgContent += `<rect x="${legendX}" y="${y - 8}" width="12" height="12" fill="${colors[index % colors.length]}"/>`;
      svgContent += `<text x="${legendX + 18}" y="${y}" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(key).substring(0, 18)}</text>`;
    });
  } else if (chartType === 'pie' || chartType === 'donut') {
    // Pie/Donut chart
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 40;
    const innerRadius = chartType === 'donut' ? radius * 0.6 : 0;

    let currentAngle = -Math.PI / 2;
    const total = allValues.reduce((sum, val) => sum + val, 0);

    chartData.forEach((item: DataPoint, index: number) => {
      const rawValue = item[dataKeys[0]];
      const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0;
      const percentage = value / total;
      const angle = percentage * 2 * Math.PI;

      const color = colors[index % colors.length];
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Calculate path for pie slice
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      if (innerRadius > 0) {
        // Donut chart
        const innerX1 = centerX + innerRadius * Math.cos(startAngle);
        const innerY1 = centerY + innerRadius * Math.sin(startAngle);
        const innerX2 = centerX + innerRadius * Math.cos(endAngle);
        const innerY2 = centerY + innerRadius * Math.sin(endAngle);

        svgContent += `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${innerX2} ${innerY2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1} Z" fill="${color}" stroke="#fff" stroke-width="2"/>`;
      } else {
        // Pie chart
        svgContent += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="#fff" stroke-width="2"/>`;
      }

      // Label
      const labelAngle = startAngle + angle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + labelRadius * Math.cos(labelAngle);
      const labelY = centerY + labelRadius * Math.sin(labelAngle);
      svgContent += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Manrope" font-size="11" fill="#fff" font-weight="600">${Math.round(percentage * 100)}%</text>`;

      currentAngle = endAngle;
    });

    // Legend
    const legendX = padding.left + chartWidth - 120;
    chartData.forEach((item: DataPoint, index: number) => {
      const y = padding.top + (index * 20);
      const itemName = item.name || String(item[Object.keys(item)[0]] || '');
      svgContent += `<rect x="${legendX}" y="${y - 8}" width="12" height="12" fill="${colors[index % colors.length]}"/>`;
      svgContent += `<text x="${legendX + 18}" y="${y}" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(String(itemName))}</text>`;
    });
  } else if (chartType === 'radar') {
    // Radar chart - polar coordinate system
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(chartWidth, chartHeight) / 2 - 60;

    // Get number of axes (categories) from data
    const numAxes = chartData.length;
    if (numAxes === 0) return '';

    // Draw concentric circles (grid)
    for (let i = 1; i <= 5; i++) {
      const radius = (maxRadius / 5) * i;
      svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#f3f4f6" stroke-width="1"/>`;
      const labelValue = Math.round((maxValue / 5) * (5 - i));
      svgContent += `<text x="${centerX + radius + 5}" y="${centerY}" text-anchor="start" font-family="Manrope" font-size="10" fill="#6b7280">${labelValue}</text>`;
    }

    // Draw axes (spokes)
    const angleStep = (2 * Math.PI) / numAxes;
    chartData.forEach((item: DataPoint, index: number) => {
      const angle = (index * angleStep) - (Math.PI / 2);
      const endX = centerX + maxRadius * Math.cos(angle);
      const endY = centerY + maxRadius * Math.sin(angle);
      svgContent += `<line x1="${centerX}" y1="${centerY}" x2="${endX}" y2="${endY}" stroke="#e5e7eb" stroke-width="1"/>`;

      // Axis label
      const labelX = centerX + (maxRadius + 20) * Math.cos(angle);
      const labelY = centerY + (maxRadius + 20) * Math.sin(angle);
      const itemName = item.name || String(item[Object.keys(item)[0]] || '');
      svgContent += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(String(itemName))}</text>`;
    });

    // Draw data polygon for each dataKey
    dataKeys.forEach((key, keyIndex) => {
      const color = colors[keyIndex % colors.length];
      const points: string[] = [];

      chartData.forEach((item: DataPoint, index: number) => {
        const value = typeof item[key] === 'number' ? item[key] : parseFloat(String(item[key])) || 0;
        const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * maxRadius;
        const angle = (index * angleStep) - (Math.PI / 2);
        const x = centerX + normalizedValue * Math.cos(angle);
        const y = centerY + normalizedValue * Math.sin(angle);
        points.push(`${x},${y}`);

        // Draw data point
        svgContent += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
      });

      // Draw polygon
      if (points.length > 0) {
        svgContent += `<polygon points="${points.join(' ')}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>`;
      }
    });

    // Legend
    const legendX = padding.left + chartWidth - 150;
    dataKeys.forEach((key, index) => {
      const y = padding.top + (index * 20);
      svgContent += `<rect x="${legendX}" y="${y - 8}" width="12" height="12" fill="${colors[index % colors.length]}"/>`;
      svgContent += `<text x="${legendX + 18}" y="${y}" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(key)}</text>`;
    });
  } else if (chartType === 'radial') {
    // Radial chart - concentric circles (like donut but as progress rings)
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(chartWidth, chartHeight) / 2 - 40;
    const ringThickness = maxRadius / chartData.length;

    chartData.forEach((item: DataPoint, index: number) => {
      const rawValue = item[dataKeys[0]];
      const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0;
      const percentage = value / maxValue;
      const radius = maxRadius - (index * ringThickness);
      const color = colors[index % colors.length];

      // Draw background circle
      svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="${ringThickness * 0.8}"/>`;

      // Draw progress arc
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (2 * Math.PI * percentage);

      const startX = centerX + radius * Math.cos(startAngle);
      const startY = centerY + radius * Math.sin(startAngle);
      const endX = centerX + radius * Math.cos(endAngle);
      const endY = centerY + radius * Math.sin(endAngle);
      const largeArc = percentage > 0.5 ? 1 : 0;

      svgContent += `<path d="M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}" fill="none" stroke="${color}" stroke-width="${ringThickness * 0.8}" stroke-linecap="round"/>`;

      // Label
      const itemName = item.name || String(item[Object.keys(item)[0]] || '');
      const labelY = centerY - maxRadius + (index * 25) + 10;
      svgContent += `<text x="${centerX}" y="${labelY}" text-anchor="middle" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(String(itemName))}</text>`;
      svgContent += `<text x="${centerX}" y="${labelY + 15}" text-anchor="middle" font-family="Manrope" font-size="14" font-weight="600" fill="${color}">${Math.round(percentage * 100)}%</text>`;
    });
  }

  return `
    <div style="margin: 16px 0;">
      ${title}
      ${subtitle}
      <div style="overflow-x: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
        <svg width="${width}" height="${height}" style="display: block; margin: 0 auto;">
          ${svgContent}
        </svg>
      </div>
      <p style="font-family: 'Manrope', sans-serif; font-size: 12px; color: #9ca3af; margin: 8px 0 0 0; font-style: italic;">Filter: ${escapeHtml(selectedTimePeriodLabel)} | Chart Type: ${escapeHtml(chartType)}</p>
    </div>
  `;
}

// Helper function to convert markdown to HTML (matching the client-side MarkdownRenderer)
function markdownToHTML(markdown: string, processBatch2: boolean = true): string {
  try {
    if (!processBatch2) {
      // Just parse markdown without processing batch2-response
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
      return marked.parse(markdown) as string;
    }

    // Find all batch2-response divs and process them
    const batch2Regex = /<div\s+data-type=["']batch2-response["'][^>]*>([\s\S]*?)<\/div>/gi;
    const parts: Array<{ type: 'markdown' | 'batch2'; content: string; html?: string }> = [];
    let lastIndex = 0;
    let match;

    // Split content into markdown and batch2-response parts
    while ((match = batch2Regex.exec(markdown)) !== null) {
      // Add markdown part before this batch2-response
      if (match.index > lastIndex) {
        parts.push({
          type: 'markdown',
          content: markdown.substring(lastIndex, match.index),
        });
      }

      // Process batch2-response
      const jsonContent = match[1].trim();
      try {
        const data = JSON.parse(jsonContent);
        if (data.type === 'batch2' && data.blocks && Array.isArray(data.blocks)) {
          let renderedBlocks = '';
          for (const block of data.blocks) {
            if (block.type === 'table') {
              renderedBlocks += renderTableFromData(block);
            } else if (block.type === 'chart') {
              renderedBlocks += renderChartAsSVG(block);
            } else if (block.type === 'text' || block.type === 'paragraph') {
              const textHtml = markdownToHTML(block.content || '', false);
              renderedBlocks += `<div style="margin: 16px 0;">${textHtml}</div>`;
            } else if (block.type === 'heading') {
              const level = block.level || 2;
              const headingTag = `h${Math.min(Math.max(level, 1), 6)}`;
              renderedBlocks += `<${headingTag} style="font-family: 'Manrope', sans-serif; font-weight: 600; margin: 16px 0 8px 0;">${escapeHtml(block.content || '')}</${headingTag}>`;
            } else if (block.type === 'kpi-card') {
              const value = block.value || '';
              const title = block.title || '';
              const subtitle = block.subtitle || '';
              renderedBlocks += `<div style="margin: 12px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
                <div style="font-family: 'Manrope', sans-serif; font-size: 24px; font-weight: 600; color: #111827;">${escapeHtml(String(value))}</div>
                <div style="font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 600; color: #434E61; margin-top: 4px;">${escapeHtml(title)}</div>
                ${subtitle ? `<div style="font-family: 'Manrope', sans-serif; font-size: 12px; color: #6b7280; margin-top: 4px;">${escapeHtml(subtitle)}</div>` : ''}
              </div>`;
            } else if (block.type === 'comparison') {
              if (block.items && Array.isArray(block.items)) {
                const headers = ['Label', 'Current Value', 'Change'];
                const rows = block.items.map((item: DataPoint) => [
                  item.label || '',
                  item.currentValue || '',
                  (() => {
                    const change = item.change && typeof item.change === 'object'
                      ? (item.change as { value?: string; percentage?: string })
                      : undefined;
                    return change ? `${change.value || ''} (${change.percentage || ''})` : '';
                  })()
                ]);
                renderedBlocks += renderTableFromData({ headers, rows });
              }
            } else if (block.type === 'year-over-year') {
              // Render year-over-year comparison
              const change: { direction?: string; value?: string; percentage?: string } =
                block.change && typeof block.change === 'object'
                  ? (block.change as { direction?: string; value?: string; percentage?: string })
                  : {};
              const isPositive = change.direction === 'up';
              const bgColor = isPositive ? '#e5f4e4' : '#fde7e3';
              const textColor = isPositive ? '#3a8138' : '#d64933';
              renderedBlocks += `
                <div style="margin: 20px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: ${bgColor};">
                  <h3 style="font-family: 'Manrope', sans-serif; font-size: 20px; font-weight: 600; margin: 0 0 10px 0; color: #343a46;">${escapeHtml(block.title || 'Year-over-Year Comparison')}</h3>
                  ${block.description ? `<p style="font-family: 'Manrope', sans-serif; font-size: 16px; font-weight: 500; margin: 0 0 16px 0; color: #343a46;">${escapeHtml(block.description)}</p>` : ''}
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                      <p style="font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 600; color: #64748b; width: 120px; margin: 0;">${escapeHtml(block.previousYear || '')}</p>
                      <p style="font-family: 'Manrope', sans-serif; font-size: 20px; font-weight: 600; color: #343a46; width: 140px; margin: 0;">${escapeHtml(block.previousValue || '')}</p>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                      <p style="font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 600; color: #64748b; width: 120px; margin: 0;">${escapeHtml(block.currentYear || '')}</p>
                      <p style="font-family: 'Manrope', sans-serif; font-size: 20px; font-weight: 600; color: #343a46; width: 140px; margin: 0;">${escapeHtml(block.currentValue || '')}</p>
                      <div style="display: inline-flex; padding: 4px 12px; align-items: center; justify-content: center; border-radius: 12px; background: ${bgColor}; color: ${textColor}; font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;">
                        ${change.direction === 'up' ? '↑' : '↓'} ${escapeHtml(change.value || '')} (${escapeHtml(change.percentage || '')})
                      </div>
                    </div>
                  </div>
                </div>
              `;
            } else if (block.type === 'paragraph-divider') {
              // Render paragraph divider
              if (block.paragraphs && Array.isArray(block.paragraphs)) {
                block.paragraphs.forEach((para: string) => {
                  const paraHtml = markdownToHTML(para, false);
                  renderedBlocks += `<div style="margin: 8px 0; padding: 12px; border-left: 3px solid #0075AB; background: #f9fafb; border-radius: 4px;">${paraHtml}</div>`;
                });
              }
            }
          }
          parts.push({
            type: 'batch2',
            content: match[0],
            html: renderedBlocks,
          });
        }
      } catch (error) {
        console.error('Error parsing batch2-response:', error);
        parts.push({
          type: 'batch2',
          content: match[0],
          html: `<div style="margin: 16px 0; padding: 12px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; color: #92400e;">
            <strong>Note:</strong> Could not render interactive content.
          </div>`,
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining markdown part
    if (lastIndex < markdown.length) {
      parts.push({
        type: 'markdown',
        content: markdown.substring(lastIndex),
      });
    }

    // If no batch2-response found, just parse as markdown
    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'markdown')) {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
      return marked.parse(markdown) as string;
    }

    // Process each part
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    let result = '';
    for (const part of parts) {
      if (part.type === 'markdown') {
        result += marked.parse(part.content) as string;
      } else if (part.type === 'batch2' && part.html) {
        result += part.html;
      }
    }

    return result;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return escapeHtml(markdown).replace(/\n/g, '<br>');
  }
}

/** Inline Qiddiya logo as base64 so PDF/image export shows it in deployed env (no network fetch). */
function getQiddiyaLogoDataUrl(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Qiddiya-logo.png');
    const buffer = fs.readFileSync(logoPath);
    return 'data:image/png;base64,' + buffer.toString('base64');
  } catch (e) {
    console.warn('[Export] Could not read Qiddiya logo from filesystem:', e);
    return '';
  }
}

// Helper function to get chat HTML content (matching the structure from chat-messages container)
async function getChatHTML(
  chatId: string,
  baseUrl: string,
  title?: string,
  conversationData?: ExportConversation | null
): Promise<string> {
  // Use provided conversation data if available, otherwise fetch
  const conversation = conversationData || await getConversationData(chatId, baseUrl);
  const logoSrc = getQiddiyaLogoDataUrl() || `${baseUrl}/Qiddiya-logo.png`;

  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Chat Export</title>
          <style>
            body { font-family: Manrope, Arial, sans-serif; padding: 20px; }
            .message { margin: 10px 0; padding: 10px; border-left: 3px solid #0075AB; }
          </style>
        </head>
        <body>
          <h1>Chat Export</h1>
          <p>Chat ID: ${chatId}</p>
          <p>No messages found in this conversation.</p>
        </body>
      </html>
    `;
  }

  const chatTitle = title || conversation.title || 'Chat Export';

  // Pro frame colors (matching AssistantMessage component - electricViolet)
  const PRO_BG = '#F5F2FF';
  const PRO_BORDER = '#ECE8FF';
  const PRO_BADGE_BORDER = '#7122F4';
  const PRO_BADGE_COLOR = '#7122F4';

  // Generate messages HTML matching the exact structure from ChatMessage components
  const messagesHtml = conversation.messages
    .map((message: { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: string; is_pro?: boolean }) => {
      const isUser = message.role === 'user';
      const isPro = !isUser && message.is_pro === true;
      const contentHtml = markdownToHTML(message.content);

      if (isUser) {
        // User message structure (matching UserMessage component)
        return `
          <div class="flex w-full py-1" style="display: flex; width: 100%; padding: 4px 0;">
            <div class="flex-1" style="flex: 1;">
              <div class="relative" style="position: relative; display: flex; padding: 12px; flex-direction: column; justify-content: center; align-items: flex-start; gap: 8px; align-self: stretch; border-radius: 8px; border: 1px solid #D5D9E2; background: #ECEEF2;">
                <div class="flex items-start gap-3 w-full" style="display: flex; align-items: flex-start; gap: 12px; width: 100%;">
                  <div class="flex shrink-0 items-center justify-center" style="display: flex; flex-shrink: 0; align-items: center; justify-content: center; height: 32px; width: 32px; border-radius: 999px; border: 0.5px solid rgba(0, 0, 0, 0.08); background-color: rgba(255, 255, 255, 0.5);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#434E61" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0 relative" style="flex: 1; min-width: 0; position: relative;">
                    <div class="user-message-content-wrapper" style="margin: 5px 0; font-family: 'Manrope', sans-serif; font-size: 16px; font-weight: 600; line-height: 24px; color: #3A4252;">
                      <div class="user-message-content">
                        ${contentHtml}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // Assistant message structure (matching AssistantMessage component)
        // Pro frame: background, border, and Pro badge at top when is_pro=true
        const proFrameStyle = isPro
          ? `background-color: ${PRO_BG}; border: 1px solid ${PRO_BORDER}; border-radius: 8px; padding: 12px 16px;`
          : 'padding: 12px 8px;';
        return `
          <div class="flex w-full py-1" style="display: flex; width: 100%; padding: 4px 0; background: transparent;">
            <div class="flex-1 overflow-hidden" style="flex: 1; overflow: hidden; ${proFrameStyle}">
              ${isPro ? `
              <div style="display: flex; justify-content: flex-end; width: 100%; margin-bottom: 8px;">
                <span style="display: inline-flex; align-items: center; width: fit-content; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; border: 1px solid ${PRO_BADGE_BORDER}; color: ${PRO_BADGE_COLOR}; font-family: 'Manrope', sans-serif;">
                  Pro
                </span>
              </div>
              ` : ''}
              <div class="flex-1 prose prose-sm max-w-none text-gray-800" style="flex: 1; max-width: none; color: #1f2937; font-size: 16px; align-self: stretch; font-family: 'Manrope', sans-serif;">
                <div class="bot-response-text">
                  ${contentHtml}
                </div>
              </div>
            </div>
          </div>
        `;
      }
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(chatTitle)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 20px;
            font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #fff;
            color: #343A46;
          }
          #pdf-wrapper {
            max-width: 800px;
            margin: 0 auto;
          }
          #pdf-wrapper header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          #pdf-wrapper header img {
            width: 40px;
            height: 40px;
          }
          #pdf-wrapper header h2 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            font-family: 'Manrope', sans-serif;
          }
          #pdf-wrapper #content {
            margin: 20px 0;
            width: 800px;
            max-width: 800px;
          }
          #pdf-wrapper #content > div {
            margin-bottom: 8px;
          }
          #pdf-wrapper footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #888;
            font-family: 'Manrope', sans-serif;
          }
          h1 {
            font-family: 'Manrope', sans-serif;
            font-weight: 600;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
          }
          code {
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            padding: 2px 4px;
            border-radius: 2px;
          }
          .user-message-content p,
          .user-message-content ul,
          .user-message-content ol,
          .user-message-content li {
            color: #3A4252 !important;
            font-family: 'Manrope', sans-serif !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            line-height: 24px !important;
            margin: 0 !important;
          }
          .bot-response-text p,
          .bot-response-text ul,
          .bot-response-text ol,
          .bot-response-text li {
            color: #1f2937 !important;
            font-family: 'Manrope', sans-serif !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            line-height: 24px !important;
            margin: 8px 0 !important;
          }
          .bot-response-text strong {
            font-weight: 600 !important;
            color: #111827 !important;
            font-family: 'Manrope', sans-serif !important;
          }
          .bot-response-text h1,
          .bot-response-text h2,
          .bot-response-text h3,
          .bot-response-text h4,
          .bot-response-text h5,
          .bot-response-text h6 {
            font-family: 'Manrope', sans-serif !important;
            font-weight: 600 !important;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
            font-family: 'Manrope', sans-serif;
            border: 1px solid #e5e7eb;
          }
          table th,
          table td {
            border: 1px solid #e5e7eb;
            padding: 8px 16px;
            text-align: left;
            font-family: 'Manrope', sans-serif;
            font-size: 13px;
            line-height: 24px;
          }
          table th {
            background-color: #f9fafb;
            font-weight: 600;
            font-family: 'Manrope', sans-serif;
            color: #434E61;
          }
          table td {
            color: #434E61;
            font-weight: 500;
          }
          table tbody tr:nth-child(even) {
            background-color: #fafafa;
          }
          table tbody tr:hover {
            background-color: #f0f9ff;
          }
          blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 16px;
            margin: 16px 0;
            color: #6b7280;
            font-family: 'Manrope', sans-serif;
          }
          a {
            font-family: 'Manrope', sans-serif;
          }
          span, div {
            font-family: 'Manrope', sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="pdf-wrapper">
          <header>
            <img src="${logoSrc}" alt="Qiddiya Logo" onerror="this.style.display='none'" />
            <h2>Q-Brain AI Assistant</h2>
          </header>
          <div id="content">
            <h1 style="font-size: 20px; margin-bottom: 20px; color: #111827; font-family: 'Manrope', sans-serif; font-weight: 600;">${escapeHtml(chatTitle)}</h1>
            <div class="mt-5" style="margin-top: 20px;">
              ${messagesHtml}
            </div>
          </div>
          <footer>
            © Qiddiya 2026 — Generated by Q-Brain AI Assistant
          </footer>
        </div>
      </body>
    </html>
  `;
}

// Helper function to process HTML for export
function processHTML(html: string, baseUrl: string): string {
  let processedHtml = html.replace(
    /src="(\/[^"]+)"/g,
    (match, path) => {
      const cleanPath = path.split('?')[0];
      if (!cleanPath.startsWith('http')) {
        return `src="${baseUrl}${cleanPath}"`;
      }
      return match;
    }
  );

  processedHtml = processedHtml.replace(
    /srcset="(\/[^"]+)"/g,
    (match, path) => {
      const cleanPath = path.split('?')[0];
      if (!cleanPath.startsWith('http')) {
        return `srcset="${baseUrl}${cleanPath}"`;
      }
      return match;
    }
  );

  processedHtml = processedHtml.replace(
    /src="[^"]*[Aa][Ii]_?[Aa]vatar[^"]*"/g,
    `src="${baseUrl}/AI_Avatar.png"`
  );

  return processedHtml;
}

// POST handler for PDF export - handles conversationData and HTML content
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');

    // Only process JSON requests
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Read the body once
    let body;
    try {
      body = await request.json();
      console.log('[Export] POST request received, body keys:', Object.keys(body));
    } catch (parseError) {
      console.error('[Export] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Parse tableChartContent if it's a string (from form data or URL-encoded)
    let tableChartContent: TableChartContent | string | null = null;
    if (body.tableChartContent) {
      if (typeof body.tableChartContent === 'string') {
        try {
          tableChartContent = JSON.parse(body.tableChartContent);
        } catch {
          // If parsing fails, try to construct it from the string
          tableChartContent = body.tableChartContent;
        }
      } else {
        tableChartContent = body.tableChartContent;
      }
    }

    // Check if it has conversationData wrapper (new export functionality)
    if (body.conversationData) {
      console.log('[Export] Found conversationData in body:', {
        id: body.conversationData.id,
        title: body.conversationData.title,
        messageCount: body.conversationData.messages?.length || 0
      });
      
      // Validate conversationData structure
      if (!body.conversationData.id) {
        console.error('[Export] conversationData missing id');
        return NextResponse.json(
          { error: 'conversationData must have an id field' },
          { status: 400 }
        );
      }
      
      if (!body.conversationData.messages || !Array.isArray(body.conversationData.messages)) {
        console.error('[Export] conversationData missing messages array');
        return NextResponse.json(
          { error: 'conversationData must have a messages array' },
          { status: 400 }
        );
      }
      
      return handleExportRequest(request, body.conversationData, tableChartContent);
    }

    // Check if body itself is a conversation object (id, title, messages)
    // This handles cases where conversation is sent directly without wrapper
    if (body.id && body.messages && Array.isArray(body.messages)) {
      console.log('[Export] Found conversation object directly in body:', {
        id: body.id,
        title: body.title,
        messageCount: body.messages.length
      });
      return handleExportRequest(request, body, tableChartContent);
    }

    // Check if it has tableChartContent in body (for table/chart exports only)
    if (tableChartContent) {
      return handleExportRequest(request, null, tableChartContent);
    }

    // Check if it has HTML (existing functionality)
    if (body.html && typeof body.html === 'string') {
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      const processedHtml = processHTML(body.html, baseUrl);

      // Determine executable path: check PUPPETEER_EXECUTABLE_PATH, then CHROME_PATH, then default
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || '/usr/bin/chromium';
      console.log(`[Export] Using Chromium executable: ${executablePath}`);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: executablePath,
      });

      try {
        const page = await browser.newPage();
        await page.setContent(processedHtml, {
          waitUntil: 'networkidle0',
        });

        await page.evaluate(() => {
          return Promise.all(
            Array.from(document.images).map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
                setTimeout(resolve, 5000);
              });
            })
          );
        });

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm',
          },
        });

        await browser.close();

        return new NextResponse(Buffer.from(pdf), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="chat.pdf"',
          },
        });
      } catch (error) {
        await browser.close();
        throw error;
      }
    }

    // If we get here, the request doesn't match expected formats
    return NextResponse.json(
      { error: 'Invalid request. Expected conversationData or html in body.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('POST handler error details:', { errorMessage, errorStack, error });
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// GET handler for different export formats
export async function GET(request: NextRequest) {
  return handleExportRequest(request, null);
}

async function handleExportRequest(
  request: NextRequest,
  conversationData: ExportConversation | null,
  tableChartContentFromBody?: TableChartContent | string | null
) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const chatId = searchParams.get('chatId');
    const messageIdsParam = searchParams.get('messageIds');
    const tableChartContentParam = searchParams.get('tableChartContent');
    let messageIds: string[] | null = null;
    let tableChartContent: TableChartContent | null = null;

    if (messageIdsParam) {
      try {
        messageIds = JSON.parse(decodeURIComponent(messageIdsParam));
        console.log('[Export] Parsed messageIds from URL:', messageIds);
      } catch (error) {
        console.error('[Export] Error parsing messageIds:', error, messageIdsParam);
        messageIds = null;
      }
    } else {
      console.log('[Export] No messageIds parameter in URL');
    }

    // Check for tableChartContent from POST body first, then URL params
    if (tableChartContentFromBody) {
      if (
        typeof tableChartContentFromBody === 'object' &&
        tableChartContentFromBody !== null &&
        'type' in tableChartContentFromBody &&
        'content' in tableChartContentFromBody
      ) {
        tableChartContent = tableChartContentFromBody as TableChartContent;
      }
      console.log('[Export] Using tableChartContent from POST body:', tableChartContent);
    } else if (tableChartContentParam) {
      try {
        tableChartContent = JSON.parse(decodeURIComponent(tableChartContentParam));
        console.log('[Export] Parsed tableChartContent from URL:', tableChartContent);
      } catch (error) {
        console.error('[Export] Error parsing tableChartContent:', error, tableChartContentParam);
        tableChartContent = null;
      }
    }

    // Format is always required
    if (!format) {
      return NextResponse.json(
        { error: 'Format is required' },
        { status: 400 }
      );
    }

    // chatId is required unless exporting tableChartContent only
    if (!chatId && !tableChartContent) {
      return NextResponse.json(
        { error: 'chatId is required when exporting conversations' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    // In production, use the host from headers if available (handles proxies/load balancers)
    const host = request.headers.get('host') || url.host;
    const protocol = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https';
    const baseUrl = `${protocol}://${host}`;
    console.log('[Export] Base URL:', baseUrl, 'Original URL:', url.href);
    const title = searchParams.get('title') || undefined;

    // If tableChartContent is provided, skip conversation validation (it's not needed)
    // If conversationData is provided, use it; otherwise fetch from API
    let conversation;
    if (conversationData) {
      console.log('[Export] Processing conversationData:', {
        id: conversationData.id,
        title: conversationData.title,
        messageCount: conversationData.messages?.length || 0,
        chatIdFromUrl: chatId
      });
      
      // Validate conversation data structure (but allow empty messages if tableChartContent is being exported)
      if (!conversationData.id) {
        console.error('[Export] conversationData validation failed: missing id');
        return NextResponse.json(
          { error: 'Invalid conversation data. Missing id.' },
          { status: 400 }
        );
      }
      
      // Only validate messages array if tableChartContent is not provided
      // (tableChartContent exports don't need messages)
      if (!tableChartContent && (!conversationData.messages || !Array.isArray(conversationData.messages))) {
        console.error('[Export] conversationData validation failed: missing messages array');
        return NextResponse.json(
          { error: 'Invalid conversation data. Missing messages array.' },
          { status: 400 }
        );
      }
      
      if (!tableChartContent && conversationData.messages.length === 0) {
        console.warn('[Export] conversationData has no messages');
      }

      // Use conversationData.id as chatId if URL doesn't have chatId
      const effectiveChatIdForConversation = chatId || conversationData.id || (tableChartContent ? 'export' : '');
      
      // Ensure the conversationData ID matches the chatId from URL (if URL has chatId)
      // This prevents storing wrong conversation data
      if (chatId && conversationData.id !== chatId) {
        console.warn(`Conversation data ID (${conversationData.id}) doesn't match chatId (${chatId}). Using chatId from URL.`);
      }

      // Use provided conversation data (for newly created conversations)
      conversation = {
        id: effectiveChatIdForConversation, // Use effectiveChatId (from URL or conversationData.id)
        title: conversationData.title || 'chat',
        messages: conversationData.messages.map((msg: ExportMessage) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content || '',
          timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date().toISOString(),
          is_pro: msg.is_pro,
        })),
      };

      // Store it in the API route's store for future requests (non-blocking)
      // Only store if the IDs match to prevent overwriting wrong conversations
      const chatIdToUse = chatId || conversationData.id;
      if (conversationData.id === chatIdToUse) {
        fetch(`${baseUrl}/api/conversations/${chatIdToUse}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...conversationData,
            id: chatIdToUse, // Ensure we store with the correct ID
          }),
        }).catch(() => {
          // Ignore errors - this is just for caching
        });
      }
    } else {
      // Fetch from API or mock data
      // This is used when exporting from Chats tab (GET request)
      conversation = await getConversationData(chatId || '', baseUrl);
    }

    // Determine the effective chatId to use throughout
    const effectiveChatId = chatId || (conversationData?.id) || (tableChartContent ? 'export' : '');

    // If tableChartContent is provided, export only that content
    if (tableChartContent) {
      const exportTitle = title || tableChartContent.title || (tableChartContent.type === 'table' ? 'Table' : 'Chart');
      const sanitizedTitle = exportTitle.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100) || 'export';

      // Handle table/chart export based on format
      switch (format.toLowerCase()) {
        case 'pdf':
        case 'image':
        case 'png':
          // For PDF and Image, render table/chart visually (as it appears in chat)
          let renderedContent = '';

          if (tableChartContent.type === 'table') {
            // Parse markdown table and render as HTML table
            try {
              // Try to parse as markdown table
              const lines = tableChartContent.content.split('\n').filter(line => line.trim());
              if (lines.length > 0 && lines[0].includes('|')) {
                // It's a markdown table
                // Parse header row (first line)
                const headerLine = lines[0];
                const headers = headerLine.split('|').map(h => h.trim()).filter(h => h && !h.match(/^-+$/));

                // Skip separator row (second line: | --- | --- |)
                // Parse data rows (starting from third line)
                const dataRows = lines.slice(2).map(line => {
                  const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                  return cells;
                }).filter(row => row.length > 0);

                // renderTableFromData expects rows as array of arrays
                renderedContent = renderTableFromData({ headers, rows: dataRows });
              } else {
                // Fallback: render as preformatted text
                renderedContent = `<div style="margin: 16px 0;"><pre style="font-family: 'Manrope', sans-serif; padding: 16px; background: #f9fafb; border-radius: 8px; overflow-x: auto;">${escapeHtml(tableChartContent.content)}</pre></div>`;
              }
            } catch (error) {
              console.error('[Export] Error rendering table:', error);
              renderedContent = `<div style="margin: 16px 0;"><pre style="font-family: 'Manrope', sans-serif; padding: 16px; background: #f9fafb; border-radius: 8px; overflow-x: auto;">${escapeHtml(tableChartContent.content)}</pre></div>`;
            }
          } else {
            // Chart - parse JSON and render as SVG
            try {
              const chartData = JSON.parse(tableChartContent.content);
              if (chartData.type === 'chart' && chartData.data) {
                renderedContent = renderChartAsSVG({
                  chartType: chartData.chartType || 'bar',
                  title: chartData.title,
                  subtitle: chartData.subtitle,
                  data: chartData.data,
                  selectedTimePeriodLabel: chartData.selectedTimePeriodLabel,
                });
              } else {
                // Fallback: render as preformatted JSON
                renderedContent = `<div style="margin: 16px 0;"><pre style="font-family: 'Manrope', sans-serif; padding: 16px; background: #f9fafb; border-radius: 8px; overflow-x: auto;">${escapeHtml(tableChartContent.content)}</pre></div>`;
              }
            } catch (error) {
              console.error('[Export] Error rendering chart:', error);
              renderedContent = `<div style="margin: 16px 0;"><pre style="font-family: 'Manrope', sans-serif; padding: 16px; background: #f9fafb; border-radius: 8px; overflow-x: auto;">${escapeHtml(tableChartContent.content)}</pre></div>`;
            }
          }

          // Create HTML document with the rendered content
          const logoSrc = getQiddiyaLogoDataUrl() || `${baseUrl}/Qiddiya-logo.png`;
          const tableChartHtml = `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${escapeHtml(sanitizedTitle)}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                  * { box-sizing: border-box; }
                  body {
                    margin: 0;
                    padding: 20px;
                    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    background: #fff;
                    color: #343A46;
                  }
                  #pdf-wrapper {
                    max-width: 800px;
                    margin: 0 auto;
                  }
                  #pdf-wrapper header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e5e7eb;
                  }
                  #pdf-wrapper header img {
                    width: 40px;
                    height: 40px;
                  }
                  #pdf-wrapper header h2 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: #111827;
                    font-family: 'Manrope', sans-serif;
                  }
                  #pdf-wrapper #content {
                    margin: 20px 0;
                    width: 800px;
                    max-width: 800px;
                  }
                  h1 {
                    font-family: 'Manrope', sans-serif;
                    font-size: 20px;
                    font-weight: 600;
                    color: #111827;
                    margin: 0 0 20px 0;
                  }
                  #pdf-wrapper footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 12px;
                    color: #888;
                    font-family: 'Manrope', sans-serif;
                  }
                </style>
              </head>
              <body>
                <div id="pdf-wrapper">
                  <header>
                    <img src="${logoSrc}" alt="Qiddiya Logo" onerror="this.style.display='none'" />
                    <h2>Q-Brain AI Assistant</h2>
                  </header>
                  <div id="content">
                    <h1>${escapeHtml(sanitizedTitle)}</h1>
                    ${renderedContent}
                  </div>
                  <footer>
                    © Qiddiya 2026 — Generated by Q-Brain AI Assistant
                  </footer>
                </div>
              </body>
            </html>
          `;

          const processedTableChartHtml = processHTML(tableChartHtml, baseUrl);
          if (format.toLowerCase() === 'pdf') {
            return await exportAsPDF(processedTableChartHtml, sanitizedTitle);
          } else {
            return await exportAsImage(processedTableChartHtml, sanitizedTitle);
          }

        case 'excel':
        case 'xlsx':
          if (tableChartContent.type !== 'table') {
            return NextResponse.json(
              { error: 'Excel export is only available for tables.' },
              { status: 400 }
            );
          }
          return await exportAsExcelForTableChart(tableChartContent, sanitizedTitle);

        case 'csv':
          if (tableChartContent.type !== 'table') {
            return NextResponse.json(
              { error: 'CSV export is only available for tables.' },
              { status: 400 }
            );
          }
          return await exportAsCSVForTableChart(tableChartContent, sanitizedTitle);

        case 'md':
        case 'markdown':
          return await exportAsMarkdownForTableChart(tableChartContent, sanitizedTitle);

        case 'text':
        case 'txt':
          return await exportAsTextForTableChart(tableChartContent, sanitizedTitle);

        default:
          return NextResponse.json(
            { error: 'Unsupported format' },
            { status: 400 }
          );
      }
    }

    // Validate that we have a conversation with messages (only if not exporting tableChartContent)
    // tableChartContent exports don't require messages
    if (!tableChartContent) {
      if (!conversation || !conversation.messages || conversation.messages.length === 0) {
        return NextResponse.json(
          { error: 'No messages found in this conversation.' },
          { status: 404 }
        );
      }
    }

    // Filter messages if messageIds are provided (for sharing specific messages only)
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0 && conversation) {
      console.log('[Export] Filtering messages by IDs:', messageIds);
      const originalCount = conversation.messages.length;
      conversation = {
        ...conversation,
        messages: conversation.messages.filter((msg) => messageIds.includes(msg.id)),
      };

      console.log('[Export] Filtered messages:', { originalCount, filteredCount: conversation.messages.length });

      // Validate that we still have messages after filtering
      if (!conversation.messages || conversation.messages.length === 0) {
        return NextResponse.json(
          { error: 'No matching messages found.' },
          { status: 404 }
        );
      }
    } else {
      console.log('[Export] No messageIds provided, exporting full conversation');
    }

    // Normalize message content for export so it matches the UI (formatted text, not raw JSON)
    if (conversation && conversation.messages && conversation.messages.length > 0) {
      conversation = normalizeConversationForExport(conversation);
    }

    // Get chat HTML content (pass conversation if available)
    // effectiveChatId is now defined above
    let html: string;
    let processedHtml: string;
    try {
      console.log('[Export] Generating HTML for conversation:', {
        chatId: effectiveChatId,
        title: title || conversation?.title,
        messageCount: conversation?.messages?.length || 0
      });
      html = await getChatHTML(effectiveChatId || '', baseUrl, title, conversation);
      processedHtml = processHTML(html, baseUrl);
      console.log('[Export] HTML generated successfully, length:', processedHtml.length);
    } catch (htmlError) {
      console.error('[Export] Error generating HTML:', htmlError);
      const htmlErrorMessage = htmlError instanceof Error ? htmlError.message : 'Unknown HTML generation error';
      throw new Error(`Failed to generate HTML: ${htmlErrorMessage}`);
    }

    // Get title from conversation or parameter
    const exportTitle = title || conversation?.title || 'chat';
    const sanitizedTitle = exportTitle.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100) || 'chat';

    switch (format.toLowerCase()) {
      case 'pdf':
        return await exportAsPDF(processedHtml, sanitizedTitle);

      case 'image':
      case 'png':
        return await exportAsImage(processedHtml, sanitizedTitle);

      case 'excel':
      case 'xlsx':
        return await exportAsExcel(effectiveChatId || '', baseUrl, sanitizedTitle, conversation);

      case 'csv':
        return await exportAsCSV(effectiveChatId || '', baseUrl, sanitizedTitle, conversation);

      case 'md':
      case 'markdown':
        return await exportAsMarkdown(effectiveChatId || '', baseUrl, sanitizedTitle, conversation);

      case 'text':
      case 'txt':
        return await exportAsText(effectiveChatId || '', baseUrl, sanitizedTitle, conversation);

      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error exporting chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack, error });
    return NextResponse.json(
      { 
        error: 'Failed to export chat',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

async function exportAsPDF(html: string, title: string = 'chat'): Promise<NextResponse> {
  let browser;
  try {
    const launchOptions: {
      headless: boolean;
      args: string[];
      executablePath?: string;
    } = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };

    // Determine executable path: check PUPPETEER_EXECUTABLE_PATH, then CHROME_PATH, then default locations
    // In production/Docker, Chromium is installed system-wide
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(`[Export] Using PUPPETEER_EXECUTABLE_PATH: ${launchOptions.executablePath}`);
    } else if (process.env.CHROME_PATH) {
      launchOptions.executablePath = process.env.CHROME_PATH;
      console.log(`[Export] Using CHROME_PATH: ${launchOptions.executablePath}`);
    } else if (process.env.NODE_ENV === 'production') {
      // In production, default to system Chromium locations
      const possiblePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];
      
      // Try to find an existing Chromium/Chrome executable
      for (const path of possiblePaths) {
        try {
          if (fs.existsSync(path)) {
            launchOptions.executablePath = path;
            console.log(`[Export] Found system Chromium at: ${path}`);
            break;
          }
        } catch {
          // Continue checking other paths
        }
      }
      
      if (!launchOptions.executablePath) {
        // Final fallback: use the default Chromium path from Dockerfile
        launchOptions.executablePath = '/usr/bin/chromium';
        console.log('[Export] Using default Chromium path: /usr/bin/chromium');
      }
    } else {
      console.log('[Export] Using Puppeteer bundled Chromium (development mode)');
    }

    try {
      browser = await puppeteer.launch(launchOptions);
      console.log(`[Export] Puppeteer launched successfully with executable: ${launchOptions.executablePath || 'bundled'}`);
    } catch (launchError) {
      console.error('[Export] Puppeteer launch failed:', launchError);
      const launchErrorMessage = launchError instanceof Error ? launchError.message : 'Unknown launch error';
      
      // Provide helpful error message
      let errorDetails = `Failed to launch browser: ${launchErrorMessage}.`;
      if (process.env.NODE_ENV === 'production') {
        errorDetails += ' In production, ensure Chromium is installed and PUPPETEER_EXECUTABLE_PATH or CHROME_PATH is set correctly.';
      } else {
        errorDetails += ' Run: npx puppeteer browsers install chrome';
      }
      
      throw new Error(errorDetails);
    }

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 5000);
          });
        })
      );
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title}.pdf"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => { });
    }
    console.error('PDF export error:', error);
    throw error;
  }
}

async function exportAsImage(html: string, title: string = 'chat'): Promise<NextResponse> {
  let browser;
  try {
    const launchOptions: {
      headless: boolean;
      args: string[];
      executablePath?: string;
    } = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };

    // Determine executable path: check PUPPETEER_EXECUTABLE_PATH, then CHROME_PATH, then default locations
    // In production/Docker, Chromium is installed system-wide
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(`[Export] Using PUPPETEER_EXECUTABLE_PATH: ${launchOptions.executablePath}`);
    } else if (process.env.CHROME_PATH) {
      launchOptions.executablePath = process.env.CHROME_PATH;
      console.log(`[Export] Using CHROME_PATH: ${launchOptions.executablePath}`);
    } else if (process.env.NODE_ENV === 'production') {
      // In production, default to system Chromium locations
      const possiblePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ];
      
      // Try to find an existing Chromium/Chrome executable
      for (const path of possiblePaths) {
        try {
          if (fs.existsSync(path)) {
            launchOptions.executablePath = path;
            console.log(`[Export] Found system Chromium at: ${path}`);
            break;
          }
        } catch {
          // Continue checking other paths
        }
      }
      
      if (!launchOptions.executablePath) {
        // Final fallback: use the default Chromium path from Dockerfile
        launchOptions.executablePath = '/usr/bin/chromium';
        console.log('[Export] Using default Chromium path: /usr/bin/chromium');
      }
    } else {
      console.log('[Export] Using Puppeteer bundled Chromium (development mode)');
    }

    try {
      browser = await puppeteer.launch(launchOptions);
      console.log(`[Export] Puppeteer launched successfully with executable: ${launchOptions.executablePath || 'bundled'}`);
    } catch (launchError) {
      console.error('[Export] Puppeteer launch failed:', launchError);
      const launchErrorMessage = launchError instanceof Error ? launchError.message : 'Unknown launch error';
      
      // Provide helpful error message
      let errorDetails = `Failed to launch browser: ${launchErrorMessage}.`;
      if (process.env.NODE_ENV === 'production') {
        errorDetails += ' In production, ensure Chromium is installed and PUPPETEER_EXECUTABLE_PATH or CHROME_PATH is set correctly.';
      } else {
        errorDetails += ' Run: npx puppeteer browsers install chrome';
      }
      
      throw new Error(errorDetails);
    }

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 5000);
          });
        })
      );
    });

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
    });

    await browser.close();

    return new NextResponse(Buffer.from(screenshot), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${title}.png"`,
      },
    });
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => { });
    }
    console.error('Image export error:', error);
    throw error;
  }
}

async function exportAsExcel(
  chatId: string,
  baseUrl: string,
  title: string = 'chat',
  conversationData?: ExportConversation | null
): Promise<NextResponse> {
  const conversation = conversationData || await getConversationData(chatId, baseUrl);

  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return NextResponse.json(
      { error: 'No messages found in this conversation' },
      { status: 404 }
    );
  }

  const matrix: string[][] = [
    ['Role', 'Message', 'Timestamp'],
    ...conversation.messages.map(
      (msg: { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: string }) => [
        msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System',
        markdownToPlainText(msg.content),
        new Date(msg.timestamp).toISOString(),
      ]
    ),
  ];

  const buffer = matrixToXlsxBuffer(matrix);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${title}.xlsx"`,
    },
  });
}

async function exportAsCSV(
  chatId: string,
  baseUrl: string,
  title: string = 'chat',
  conversationData?: ExportConversation | null
): Promise<NextResponse> {
  const conversation = conversationData || await getConversationData(chatId, baseUrl);

  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return NextResponse.json(
      { error: 'No messages found in this conversation' },
      { status: 404 }
    );
  }

  const matrix: string[][] = [
    ['Role', 'Message', 'Timestamp'],
    ...conversation.messages.map(
      (msg: { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: string }) => [
        msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System',
        markdownToPlainText(msg.content),
        new Date(msg.timestamp).toISOString(),
      ]
    ),
  ];

  const csvContent = `\uFEFF${matrixToCsv(matrix)}`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${title}.csv"`,
    },
  });
}

async function exportAsMarkdown(
  chatId: string,
  baseUrl: string,
  title: string = 'chat',
  conversationData?: ExportConversation | null
): Promise<NextResponse> {
  const conversation = conversationData || await getConversationData(chatId, baseUrl);

  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return NextResponse.json(
      { error: 'No messages found in this conversation' },
      { status: 404 }
    );
  }

  const exportTitle = title || conversation.title || 'Chat Export';
  const exportDate = new Date().toLocaleString();

  const messagesMarkdown = conversation.messages
    .map((msg: { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: string }) => {
      const isUser = msg.role === 'user';
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const roleLabel = isUser ? '**You**' : '**AI Assistant**';
      return `## ${roleLabel} - ${timestamp}\n\n${msg.content}\n`;
    })
    .join('\n---\n\n');

  const markdownContent = `# ${exportTitle}\n\n**Export Date:** ${exportDate}\n\n---\n\n${messagesMarkdown}`;

  return new NextResponse(markdownContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${title}.md"`,
    },
  });
}

async function exportAsText(
  chatId: string,
  baseUrl: string,
  title: string = 'chat',
  conversationData?: ExportConversation | null
): Promise<NextResponse> {
  const conversation = conversationData || await getConversationData(chatId, baseUrl);

  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return NextResponse.json(
      { error: 'No messages found in this conversation' },
      { status: 404 }
    );
  }

  const exportTitle = title || conversation.title || 'Chat Export';
  const exportDate = new Date().toLocaleString();

  // Convert messages to plain text format
  const messagesText = conversation.messages
    .map((msg: ExportMessage) => {
      const isUser = msg.role === 'user';
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const roleLabel = isUser ? 'You' : 'AI Assistant';
      // Convert markdown to plain text
      const plainContent = markdownToPlainText(msg.content);
      return `${roleLabel} (${timestamp}):\n${plainContent}\n`;
    })
    .join('\n---\n\n');

  const textContent = `${exportTitle}\nExport Date: ${exportDate}\n\n---\n\n${messagesText}`;

  return new NextResponse(textContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${title}.txt"`,
    },
  });
}

// Export functions for table/chart content only (Excel/CSV are table-only; callers must check type)
async function exportAsExcelForTableChart(
  tableChartContent: { type: 'table' | 'chart'; content: string; title?: string },
  title: string
): Promise<NextResponse> {
  const matrix = parseMarkdownTableToMatrix(tableChartContent.content);
  if (!matrix || matrix.length === 0) {
    return NextResponse.json({ error: 'Could not parse table for Excel export.' }, { status: 400 });
  }

  const buffer = matrixToXlsxBuffer(matrix);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${title}.xlsx"`,
    },
  });
}

async function exportAsCSVForTableChart(
  tableChartContent: { type: 'table' | 'chart'; content: string; title?: string },
  title: string
): Promise<NextResponse> {
  const matrix = parseMarkdownTableToMatrix(tableChartContent.content);
  if (!matrix || matrix.length === 0) {
    return NextResponse.json({ error: 'Could not parse table for CSV export.' }, { status: 400 });
  }

  const csvContent = `\uFEFF${matrixToCsv(matrix)}`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${title}.csv"`,
    },
  });
}

async function exportAsMarkdownForTableChart(tableChartContent: { type: 'table' | 'chart'; content: string; title?: string }, title: string): Promise<NextResponse> {
  const exportDate = new Date().toLocaleString();
  let markdownContent = '';

  if (tableChartContent.type === 'table') {
    markdownContent = `# ${title}\n\n**Export Date:** ${exportDate}\n\n---\n\n${tableChartContent.content}`;
  } else {
    // For charts, format as markdown code block
    markdownContent = `# ${title}\n\n**Export Date:** ${exportDate}\n\n---\n\n\`\`\`json\n${tableChartContent.content}\n\`\`\``;
  }

  return new NextResponse(markdownContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${title}.md"`,
    },
  });
}

async function exportAsTextForTableChart(tableChartContent: { type: 'table' | 'chart'; content: string; title?: string }, title: string): Promise<NextResponse> {
  const exportDate = new Date().toLocaleString();
  let textContent = '';

  if (tableChartContent.type === 'table') {
    // Convert markdown table to plain text
    const lines = tableChartContent.content.split('\n');
    textContent = `${title}\nExport Date: ${exportDate}\n\n---\n\n${lines.join('\n')}`;
  } else {
    // For charts, parse JSON and format as text
    try {
      const chartData = JSON.parse(tableChartContent.content);
      textContent = `${title}\nExport Date: ${exportDate}\n\n---\n\n${JSON.stringify(chartData, null, 2)}`;
    } catch {
      textContent = `${title}\nExport Date: ${exportDate}\n\n---\n\n${tableChartContent.content}`;
    }
  }

  return new NextResponse(textContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${title}.txt"`,
    },
  });
}


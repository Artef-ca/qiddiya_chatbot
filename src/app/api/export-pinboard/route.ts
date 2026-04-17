import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import { htmlAndMarkdownToPlainText } from '@/lib/utils/textExtraction';
import * as XLSX from 'xlsx';

type DataPoint = Record<string, unknown>;

/** Inline Qiddiya logo as base64 so PDF/image export shows it in deployed env (no network fetch). */
function getQiddiyaLogoDataUrl(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Qiddiya-logo.png');
    const buffer = fs.readFileSync(logoPath);
    return 'data:image/png;base64,' + buffer.toString('base64');
  } catch (e) {
    console.warn('[Export Pinboard] Could not read Qiddiya logo from filesystem:', e);
    return '';
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

function matrixToXlsxBuffer(matrix: string[][]): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// Helper function to convert markdown to HTML
function markdownToHTML(markdown: string): string {
  try {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    return marked.parse(markdown) as string;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return escapeHtml(markdown).replace(/\n/g, '<br>');
  }
}

// Helper function to render table from batch2-response data (matches chat export styling)
function renderTableFromData(block: { headers?: unknown[]; rows?: unknown[][] }): string {
  if (!block.headers || !block.rows) {
    return '';
  }

  const headers = block.headers
    .map(
      (h) =>
        `<th style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; text-align: left;">${escapeHtml(String(h))}</th>`
    )
    .join('');

  const rows = block.rows
    .map((row: unknown[]) => {
      const cells = row
        .map((cell: unknown) => {
          const cellText = String(cell || '');
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
            ? normalizedText.includes('positive')
              ? 'Positive Label'
              : normalizedText.includes('negative')
                ? 'Negative Label'
                : normalizedText.includes('warning')
                  ? 'Warning Label'
                  : cellText
            : cellText;
          return `<td style="padding: 8px; border: 1px solid #e5e7eb; text-align: left; ${statusClass}">${escapeHtml(displayText)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

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

// Helper function to render chart as SVG (matches chat export rendering)
function renderChartAsSVG(block: { title?: string; subtitle?: string; chartType?: string; data?: DataPoint[] }): string {
  if (!block.data || !Array.isArray(block.data) || block.data.length === 0) {
    return '';
  }

  const chartData = block.data;
  const title = block.title
    ? `<h3 style="font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 600; margin: 16px 0 8px 0; color: #111827;">${escapeHtml(block.title)}</h3>`
    : '';
  const subtitle = block.subtitle
    ? `<p style="font-family: 'Manrope', sans-serif; font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">${escapeHtml(block.subtitle)}</p>`
    : '';

  const chartType = block.chartType || 'bar';
  const width = 700;
  const height = 300;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allKeys = new Set<string>();
  block.data.forEach((item: DataPoint) => {
    Object.keys(item).forEach((key) => {
      if (key !== 'name') allKeys.add(key);
    });
  });
  const dataKeys = Array.from(allKeys);
  if (dataKeys.length === 0) return '';

  const allValues: number[] = [];
  block.data.forEach((item: DataPoint) => {
    dataKeys.forEach((key) => {
      const val = item[key];
      const numVal = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      if (!isNaN(numVal)) allValues.push(numVal);
    });
  });
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  let svgContent = '';
  const barWidth = chartWidth / (chartData.length * (dataKeys.length + 0.5));
  const xScale = chartWidth / chartData.length;

  svgContent += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#e5e7eb" stroke-width="2"/>`;
  svgContent += `<line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#e5e7eb" stroke-width="2"/>`;

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    const value = maxValue - (maxValue / 5) * i;
    svgContent += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#f3f4f6" stroke-width="1" stroke-dasharray="2,2"/>`;
    svgContent += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-family="Manrope" font-size="12" fill="#6b7280">${Math.round(value)}</text>`;
  }

  chartData.forEach((item: DataPoint, index: number) => {
    const x = padding.left + (index + 0.5) * xScale;
    const itemName = item.name || String(item[Object.keys(item)[0]] || '');

    dataKeys.forEach((key, keyIndex) => {
      const value = typeof item[key] === 'number' ? item[key] : parseFloat(String(item[key])) || 0;
      const normalizedValue = ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
      const barHeight = normalizedValue;
      const color = colors[keyIndex % colors.length];

      if (chartType === 'line') {
        const pointY = padding.top + chartHeight - barHeight;
        if (index > 0) {
          const prevItem = chartData[index - 1];
          const prevRaw = prevItem[key];
          const prevValue = typeof prevRaw === 'number' ? prevRaw : parseFloat(String(prevRaw)) || 0;
          const prevNormalized = ((prevValue - minValue) / (maxValue - minValue || 1)) * chartHeight;
          const prevX = padding.left + (index - 0.5) * xScale;
          const prevY = padding.top + chartHeight - prevNormalized;
          svgContent += `<line x1="${prevX}" y1="${prevY}" x2="${x}" y2="${pointY}" stroke="${color}" stroke-width="2" fill="none"/>`;
        }
        svgContent += `<circle cx="${x}" cy="${pointY}" r="4" fill="${color}"/>`;
      } else {
        const barX = x - (barWidth * dataKeys.length) / 2 + keyIndex * barWidth;
        svgContent += `<rect x="${barX}" y="${padding.top + chartHeight - barHeight}" width="${barWidth * 0.8}" height="${barHeight}" fill="${color}" opacity="0.8"/>`;
      }
    });

    svgContent += `<text x="${x}" y="${padding.top + chartHeight + 20}" text-anchor="middle" font-family="Manrope" font-size="11" fill="#6b7280">${escapeHtml(String(itemName).substring(0, 10))}</text>`;
  });

  const legendX = padding.left + chartWidth - 150;
  dataKeys.forEach((key, index) => {
    const y = padding.top + index * 20;
    svgContent += `<rect x="${legendX}" y="${y - 8}" width="12" height="12" fill="${colors[index % colors.length]}"/>`;
    svgContent += `<text x="${legendX + 18}" y="${y}" font-family="Manrope" font-size="11" fill="#374151">${escapeHtml(key)}</text>`;
  });

  return `
    <div style="margin: 16px 0;">
      ${title}
      ${subtitle}
      <div style="overflow-x: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
        <svg width="${width}" height="${height}" style="display: block; margin: 0 auto;">
          ${svgContent}
        </svg>
      </div>
      <p style="font-family: 'Manrope', sans-serif; font-size: 12px; color: #9ca3af; margin: 8px 0 0 0; font-style: italic;">Chart Type: ${escapeHtml(chartType)}</p>
    </div>
  `;
}

// Helper function to process batch2-response divs (aligned with chat export)
function processBatch2Response(content: string): string {
  const batch2Regex = /<div\s+data-type=["']batch2-response["'][^>]*>([\s\S]*?)<\/div>/gi;
  let processedContent = content;
  let match;
  
  while ((match = batch2Regex.exec(content)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const data = JSON.parse(jsonContent) as { type?: string; blocks?: unknown[] };
      if (data.type === 'batch2' && data.blocks && Array.isArray(data.blocks)) {
        const renderedBlocks = data.blocks.map((block: unknown) => {
          const blockData = block as Record<string, unknown>;
          const blockType = String(blockData.type || '');
          if (blockType === 'table') {
            return renderTableFromData({
              headers: Array.isArray(blockData.headers) ? blockData.headers : [],
              rows: Array.isArray(blockData.rows) ? (blockData.rows as unknown[][]) : [],
            });
          } else if (blockType === 'chart') {
            return renderChartAsSVG({
              chartType: String(blockData.chartType || 'bar'),
              title: String(blockData.title || ''),
              subtitle: String(blockData.subtitle || ''),
              data: Array.isArray(blockData.data) ? (blockData.data as DataPoint[]) : [],
            });
          } else if (blockType === 'text' || blockType === 'paragraph') {
            const textHtml = markdownToHTML(String(blockData.content || ''));
            return `<div style="margin: 16px 0;">${textHtml}</div>`;
          } else if (blockType === 'heading') {
            const levelRaw = Number(blockData.level || 2);
            const level = Math.min(Math.max(levelRaw, 1), 6);
            const headingTag = `h${level}`;
            return `<${headingTag} style="font-family: 'Manrope', sans-serif; font-weight: 600; margin: 16px 0 8px 0;">${escapeHtml(String(blockData.content || ''))}</${headingTag}>`;
          } else if (blockType === 'kpi-card') {
            const value = blockData.value || '';
            const kpiTitle = blockData.title || '';
            const subtitle = blockData.subtitle || '';
            return `<div style="margin: 12px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
              <div style="font-family: 'Manrope', sans-serif; font-size: 24px; font-weight: 600; color: #111827;">${escapeHtml(String(value))}</div>
              <div style="font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 600; color: #434E61; margin-top: 4px;">${escapeHtml(String(kpiTitle))}</div>
              ${subtitle ? `<div style="font-family: 'Manrope', sans-serif; font-size: 12px; color: #6b7280; margin-top: 4px;">${escapeHtml(String(subtitle))}</div>` : ''}
            </div>`;
          } else if (blockType === 'paragraph-divider' && Array.isArray(blockData.paragraphs)) {
            return (blockData.paragraphs as unknown[])
              .map((p) => `<div style="margin: 8px 0; padding: 12px; border-left: 3px solid #0075AB; background: #f9fafb; border-radius: 4px;">${markdownToHTML(String(p || ''))}</div>`)
              .join('');
          }
          return '';
        }).join('');
        
        processedContent = processedContent.replace(match[0], renderedBlocks);
      }
    } catch (error) {
      console.error('Error processing batch2-response:', error);
      // Keep original content if processing fails
    }
  }
  
  return processedContent;
}

// Helper function to get pin board HTML content
function getPinBoardHTML(items: Array<{ id: string; content: string; title?: string; type: string }>, title: string, baseUrl: string): string {
  const logoSrc = getQiddiyaLogoDataUrl() || `${baseUrl}/Qiddiya-logo.png`;
  const itemsHtml = items
    .map((item, index) => {
      const itemTitle = item.title || `Item ${index + 1}`;
      // Normalize raw chart JSON into batch2-response so it renders as a chart.
      let normalizedContent = item.content;
      try {
        const parsed = JSON.parse(item.content);
        if (parsed && typeof parsed === 'object' && (parsed as { type?: string }).type === 'chart') {
          normalizedContent = `<div data-type="batch2-response">${JSON.stringify({
            type: 'batch2',
            blocks: [parsed],
          })}</div>`;
        }
      } catch {
        // Not JSON content; keep as-is.
      }

      // Process content - first convert markdown, then process batch2-response
      let contentHtml = markdownToHTML(normalizedContent);
      contentHtml = processBatch2Response(contentHtml);
      
      return `
        <div style="margin-bottom: 32px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff;">
          <h3 style="font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
            ${escapeHtml(itemTitle)}
          </h3>
          <div style="font-family: 'Manrope', sans-serif; font-size: 14px; line-height: 24px; color: #374151;">
            ${contentHtml}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(title)}</title>
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
          #pdf-wrapper footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #888;
            font-family: 'Manrope', sans-serif;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Manrope', sans-serif;
            font-weight: 600;
          }
          p, li {
            font-family: 'Manrope', sans-serif;
            font-size: 14px;
            line-height: 24px;
            color: #374151;
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
          blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 16px;
            margin: 16px 0;
            color: #6b7280;
            font-family: 'Manrope', sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="pdf-wrapper">
          <header>
            <img src="${logoSrc}" alt="Qiddiya Logo" onerror="this.style.display='none'" />
            <h2>Qiddiya AI Assistant</h2>
          </header>
          <div id="content">
            <h1 style="font-size: 20px; margin-bottom: 20px; color: #111827; font-family: 'Manrope', sans-serif; font-weight: 600;">${escapeHtml(title)}</h1>
            <div class="mt-5" style="margin-top: 20px;">
              ${itemsHtml}
            </div>
          </div>
          <footer>
            © Qiddiya 2025 — Generated by Qiddiya AI Assistant
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

  return processedHtml;
}

async function exportAsPDF(html: string, title: string = 'Pin Board'): Promise<NextResponse> {
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
    
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(`[Export Pinboard] Using PUPPETEER_EXECUTABLE_PATH: ${launchOptions.executablePath}`);
    } else if (process.env.CHROME_PATH) {
      launchOptions.executablePath = process.env.CHROME_PATH;
      console.log(`[Export Pinboard] Using CHROME_PATH: ${launchOptions.executablePath}`);
    } else if (process.env.NODE_ENV === 'production') {
      const possiblePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
      ];
      for (const p of possiblePaths) {
        try {
          if (fs.existsSync(p)) {
            launchOptions.executablePath = p;
            console.log(`[Export Pinboard] Found system Chromium at: ${p}`);
            break;
          }
        } catch {
          // Continue checking other paths
        }
      }
      if (!launchOptions.executablePath) {
        launchOptions.executablePath = '/usr/bin/chromium';
        console.log('[Export Pinboard] Using default Chromium path: /usr/bin/chromium');
      }
    }

    try {
      browser = await puppeteer.launch(launchOptions);
      console.log(`[Export Pinboard] Puppeteer launched successfully with executable: ${launchOptions.executablePath || 'bundled'}`);
    } catch (launchError) {
      const launchErrorMessage = launchError instanceof Error ? launchError.message : 'Unknown launch error';
      let errorDetails = `Failed to launch browser: ${launchErrorMessage}.`;
      if (process.env.NODE_ENV === 'production') {
        errorDetails += ' Ensure Chromium is installed and PUPPETEER_EXECUTABLE_PATH or CHROME_PATH is configured.';
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
      await browser.close().catch(() => {});
    }
    console.error('PDF export error:', error);
    throw error;
  }
}

// Convert HTML/markdown to plain text for export (no HTML; lists as bullets, tables as text)
function markdownToPlainText(content: string): string {
  return htmlAndMarkdownToPlainText(content);
}

async function exportAsImage(html: string, title: string = 'Pin Board'): Promise<NextResponse> {
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
    
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(`[Export Pinboard] Using PUPPETEER_EXECUTABLE_PATH: ${launchOptions.executablePath}`);
    } else if (process.env.CHROME_PATH) {
      launchOptions.executablePath = process.env.CHROME_PATH;
      console.log(`[Export Pinboard] Using CHROME_PATH: ${launchOptions.executablePath}`);
    } else if (process.env.NODE_ENV === 'production') {
      const possiblePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
      ];
      for (const p of possiblePaths) {
        try {
          if (fs.existsSync(p)) {
            launchOptions.executablePath = p;
            console.log(`[Export Pinboard] Found system Chromium at: ${p}`);
            break;
          }
        } catch {
          // Continue checking other paths
        }
      }
      if (!launchOptions.executablePath) {
        launchOptions.executablePath = '/usr/bin/chromium';
        console.log('[Export Pinboard] Using default Chromium path: /usr/bin/chromium');
      }
    }

    try {
      browser = await puppeteer.launch(launchOptions);
      console.log(`[Export Pinboard] Puppeteer launched successfully with executable: ${launchOptions.executablePath || 'bundled'}`);
    } catch (launchError) {
      const launchErrorMessage = launchError instanceof Error ? launchError.message : 'Unknown launch error';
      let errorDetails = `Failed to launch browser: ${launchErrorMessage}.`;
      if (process.env.NODE_ENV === 'production') {
        errorDetails += ' Ensure Chromium is installed and PUPPETEER_EXECUTABLE_PATH or CHROME_PATH is configured.';
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
      await browser.close().catch(() => {});
    }
    console.error('Image export error:', error);
    throw error;
  }
}

async function exportAsExcel(items: Array<{ id: string; content: string; title?: string; type: string }>, title: string = 'Pin Board'): Promise<NextResponse> {
  const matrix: string[][] = [
    ['Title', 'Content', 'Type'],
    ...items.map((item) => [
      item.title || 'Untitled',
      markdownToPlainText(item.content),
      item.type || 'response',
    ]),
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

async function exportAsCSV(items: Array<{ id: string; content: string; title?: string; type: string }>, title: string = 'Pin Board'): Promise<NextResponse> {
  const matrix: string[][] = [
    ['Title', 'Content', 'Type'],
    ...items.map((item) => [
      item.title || 'Untitled',
      markdownToPlainText(item.content),
      item.type || 'response',
    ]),
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

async function exportAsMarkdown(items: Array<{ id: string; content: string; title?: string; type: string }>, title: string = 'Pin Board'): Promise<NextResponse> {
  const exportDate = new Date().toLocaleString();
  
  const itemsMarkdown = items
    .map((item, index) => {
      const itemTitle = item.title || `Item ${index + 1}`;
      return `## ${itemTitle}\n\n${item.content}\n`;
    })
    .join('\n---\n\n');
  
  const markdownContent = `# ${title}\n\n**Export Date:** ${exportDate}\n\n---\n\n${itemsMarkdown}`;
  
  return new NextResponse(markdownContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${title}.md"`,
    },
  });
}

async function exportAsText(items: Array<{ id: string; content: string; title?: string; type: string }>, title: string = 'Pin Board'): Promise<NextResponse> {
  const exportDate = new Date().toLocaleString();
  
  const itemsText = items
    .map((item, index) => {
      const itemTitle = item.title || `Item ${index + 1}`;
      // Convert markdown/HTML to plain text
      const plainText = markdownToPlainText(item.content);
      return `${itemTitle}\n\n${plainText}\n`;
    })
    .join('\n---\n\n');
  
  const textContent = `${title}\nExport Date: ${exportDate}\n\n---\n\n${itemsText}`;
  
  return new NextResponse(textContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${title}.txt"`,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, title, items } = body;

    if (!format || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Format and items array are required' },
        { status: 400 }
      );
    }

    // All formats are supported

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const exportTitle = title || 'Pin Board';
    const sanitizedTitle = exportTitle.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 100) || 'Pin Board';

    // Get pin board HTML content
    const html = getPinBoardHTML(items, sanitizedTitle, baseUrl);
    const processedHtml = processHTML(html, baseUrl);

    switch (format.toLowerCase()) {
      case 'pdf':
        return await exportAsPDF(processedHtml, sanitizedTitle);
      
      case 'image':
      case 'png':
        return await exportAsImage(processedHtml, sanitizedTitle);
      
      case 'excel':
      case 'xlsx':
        return await exportAsExcel(items, sanitizedTitle);
      
      case 'csv':
        return await exportAsCSV(items, sanitizedTitle);
      
      case 'md':
      case 'markdown':
        return await exportAsMarkdown(items, sanitizedTitle);
      
      case 'text':
      case 'txt':
        return await exportAsText(items, sanitizedTitle);
      
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error exporting pin board:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to export pin board',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}


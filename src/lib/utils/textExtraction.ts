/**
 * Utility functions for extracting plain text from markdown/HTML content
 * Used for copy-to-clipboard and text-to-speech functionality
 */

import { formatMessageContentForDisplay } from './formatMessageContent';

/** Strip all HTML tags from a string. */
function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/** Decode common HTML entities. */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Converts HTML and markdown to plain text for copy/export.
 * Preserves lists as bullet lines (- item) and tables as text (pipe or tab separated).
 * Strips all HTML tags and markdown syntax so output is plain text only.
 */
export function htmlAndMarkdownToPlainText(content: string): string {
  if (!content || typeof content !== 'string') return '';
  let text = content;

  // 0. Convert batch2-response divs (JSON tables/charts) to plain text
  text = text.replace(/<div\s+data-type=["']batch2-response["'][^>]*>([\s\S]*?)<\/div>/gi, (_match, inner) => {
    const trimmed = inner.trim();
    try {
      const data = JSON.parse(trimmed);
      if (data?.type === 'batch2' && Array.isArray(data.blocks)) {
        const lines: string[] = [];
        for (const block of data.blocks) {
          if (block.type === 'table' && block.headers && block.rows) {
            const headers = (block.headers as string[]).join(' | ');
            lines.push(headers);
            for (const row of block.rows as (string | number)[][]) {
              lines.push(row.map((c) => String(c ?? '')).join(' | '));
            }
          } else if (block.type === 'chart') {
            lines.push('Chart: ' + (block.title || 'Chart'));
          } else if (block.type === 'text' || block.type === 'paragraph') {
            const t = (block.content || '').toString();
            if (t) lines.push(stripHtmlTags(t).trim());
          } else if (block.type === 'paragraph-divider' && Array.isArray(block.paragraphs)) {
            for (const p of block.paragraphs) {
              const t = (p || '').toString().trim();
              if (t) lines.push(stripHtmlTags(t));
            }
          }
        }
        return '\n' + lines.join('\n') + '\n';
      }
    } catch {
      // Not valid JSON, fall through to strip tags
    }
    return '\n' + stripHtmlTags(trimmed).trim() + '\n';
  });

  // 1. Convert HTML tables to plain text (rows as lines, cells separated by |)
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, inner) => {
    const rows: string[] = [];
    const trMatches = inner.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    for (const tr of trMatches) {
      const cellMatches = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      const cells = cellMatches.map((cell: string) => {
        const cellInner = cell.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i, '$1');
        return decodeHtmlEntities(stripHtmlTags(cellInner)).trim();
      });
      rows.push(cells.join(' | '));
    }
    return '\n' + rows.join('\n') + '\n';
  });

  // 2. Convert HTML list items to bullet lines
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, inner) => {
    const plain = decodeHtmlEntities(stripHtmlTags(inner)).trim();
    return plain ? '\n- ' + plain : '';
  });
  // Remove remaining list wrapper tags (they become redundant after li conversion)
  text = text.replace(/<\/?[ou]l[^>]*>/gi, '\n');

  // 3. Block elements: add newlines so structure is preserved
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n');

  // 4. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 5. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 6. Strip markdown (but keep list markers - and table |)
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/#{1,6}\s+/g, '');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*([^*]*?)\*/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  text = text.replace(/~~(.*?)~~/g, '$1');
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/^[-*_]{3,}$/gm, '');
  // Markdown table separator row (| --- | --- |) — remove so we don't duplicate
  text = text.replace(/^\|[\s\-:|]+\|$/gm, '');

  // 7. Normalize whitespace: collapse multiple spaces, trim lines, max 2 newlines
  text = text.replace(/[ \t]+/g, ' ');
  text = text.split('\n').map((line) => line.trim()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Extracts plain text from markdown/HTML content, removing all formatting
 * @param content - The markdown/HTML content to extract text from
 * @returns Plain text without any formatting
 */
export function extractPlainText(content: string | unknown): string {
  if (!content) return '';
  
  // Ensure content is a string
  const contentStr = typeof content === 'string' ? content : String(content);

  let text = contentStr;

  // Remove HTML tags (including custom data attributes)
  // This handles <div>, <ul>, <li>, <span>, etc.
  text = text.replace(/<[^>]+>/g, '');

  // Remove markdown code blocks (triple backticks)
  text = text.replace(/```[\s\S]*?```/g, '');

  // Remove inline code (single backticks)
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove markdown headers
  text = text.replace(/#{1,6}\s+/g, '');

  // Remove markdown bold (**text**)
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');

  // Remove markdown italic (*text*)
  text = text.replace(/\*(.*?)\*/g, '$1');

  // Remove markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Remove markdown images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');

  // Remove markdown strikethrough (~~text~~)
  text = text.replace(/~~(.*?)~~/g, '$1');

  // Remove markdown blockquotes
  text = text.replace(/^>\s+/gm, '');

  // Remove markdown horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // Clean up markdown tables
  // Remove table separators (| --- | --- |)
  text = text.replace(/^\|[\s\-:|]+\|$/gm, '');

  // Convert table rows to readable format
  // | col1 | col2 | -> col1 col2
  text = text.replace(/^\|(.+)\|$/gm, (match, row) => {
    // Split by | and clean up each cell
    const cells = row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
    return cells.join(' | ');
  });

  // Remove markdown list markers (-, *, +, 1.)
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // Remove markdown checkboxes (- [ ] and - [x])
  text = text.replace(/\[[\sx]\]\s*/g, '');

  // Remove multiple spaces
  text = text.replace(/\s+/g, ' ');

  // Remove leading/trailing whitespace from each line
  text = text.split('\n').map(line => line.trim()).join('\n');

  // Remove multiple consecutive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Replace newlines with spaces for better readability (optional, can be adjusted)
  // For copy: keep newlines for structure
  // For speech: replace with periods
  return text.trim();
}

/** Block types that should NOT be read aloud (tables, charts, KPI cards, etc.) */
const SPEECH_EXCLUDED_BLOCK_TYPES = new Set([
  'table',
  'chart',
  'kpi-card',
  'comparison',
  'year-over-year',
]);

/** Extract text from a single block for speech. Returns empty string for excluded types. */
function extractTextFromBlockForSpeech(block: Record<string, unknown>): string {
  const type = (block.type as string) || '';
  if (SPEECH_EXCLUDED_BLOCK_TYPES.has(type)) return '';

  if (type === 'text' || type === 'paragraph') {
    const t = (block.content || '').toString().trim();
    return t ? stripHtmlTags(t) : '';
  }
  if (type === 'paragraph-divider' && Array.isArray(block.paragraphs)) {
    return (block.paragraphs as string[])
      .map((p) => (p || '').toString().trim())
      .filter(Boolean)
      .map((p) => stripHtmlTags(p))
      .join(' ');
  }
  if (type === 'heading') {
    const t = (block.content || block.title || '').toString().trim();
    return t ? stripHtmlTags(t) : '';
  }
  if (type === 'list' && Array.isArray(block.items)) {
    return (block.items as Array<string | { text: string; children?: string[] }>)
      .map((item) => {
        if (typeof item === 'string') return stripHtmlTags(item);
        if (item && typeof item === 'object' && 'text' in item) {
          const text = (item as { text: string }).text || '';
          const children = (item as { children?: string[] }).children;
          const childText = Array.isArray(children) ? children.map(stripHtmlTags).join(' ') : '';
          return stripHtmlTags(text) + (childText ? ' ' + childText : '');
        }
        return '';
      })
      .filter(Boolean)
      .join('. ');
  }
  if (type === 'highlighted-text') {
    const t = (block.content || '').toString().trim();
    return t ? stripHtmlTags(t) : '';
  }
  // Fallback for unknown text-like blocks (e.g. bullets, bullet-list)
  if (type === 'bullets' || type === 'bullet-list' || type === 'bullet_points') {
    const items = (block.items as string[]) || [];
    return items.map(stripHtmlTags).filter(Boolean).join('. ');
  }
  const content = block.content ?? block.text ?? block.textContent;
  if (typeof content === 'string' && content.trim()) return stripHtmlTags(content);
  return '';
}

/** Extract text-only content from a single batch2-response div (excludes tables, charts, KPI, comparison). */
function extractSpeechTextFromBatch2Div(inner: string): string {
  try {
    const data = JSON.parse(inner.trim());
    if (data?.type !== 'batch2' || !Array.isArray(data.blocks)) return '';
    const parts: string[] = [];
    for (const block of data.blocks) {
      const text = extractTextFromBlockForSpeech(block as Record<string, unknown>);
      if (text) parts.push(text);
    }
    return parts.join('. ');
  } catch {
    return '';
  }
}

/** Replace batch2-response divs with their text-only content for speech. */
function replaceBatch2DivsWithSpeechText(contentStr: string): string {
  return contentStr.replace(
    /<div\s+data-type=["']batch2-response["'][^>]*>([\s\S]*?)<\/div>/gi,
    (_match, inner) => {
      const text = extractSpeechTextFromBatch2Div(inner);
      return text ? `\n${text}\n` : '';
    }
  );
}

/** Remove markdown tables from content (entire table including header, separator, rows). */
function removeMarkdownTables(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inTable = false;
  for (const line of lines) {
    const isTableRow = /^\|[\s\S]*\|$/.test(line.trim());
    const isTableSeparator = /^\|[\s\-:|]+\|$/.test(line.trim());
    if (isTableRow || isTableSeparator) {
      inTable = true;
      continue;
    }
    if (inTable && !isTableRow) inTable = false;
    result.push(line);
  }
  return result.join('\n');
}

/** Remove HTML tables from content (excluded from speech). */
function removeHtmlTables(content: string): string {
  return content.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
}

/**
 * Extracts plain text optimized for text-to-speech
 * Reads ONLY paragraph/text content; excludes tables, charts, KPI cards, comparison blocks
 * Formats raw JSON message content (like UI) before extracting text
 * @param content - The markdown/HTML content to extract text from (may be raw JSON)
 * @returns Plain text optimized for speech synthesis (text only, no tables/charts)
 */
export function extractSpeechText(content: string | unknown): string {
  if (!content) return '';

  // First format the content (handles raw JSON like {"role":"user","parts":[{"text":"Hello"}]})
  const formattedContent = formatMessageContentForDisplay(content);
  const contentStr = typeof formattedContent === 'string' ? formattedContent : String(formattedContent);

  // Replace batch2-response divs with text-only content (excludes table, chart, kpi-card, comparison)
  const withBatch2Replaced = replaceBatch2DivsWithSpeechText(contentStr);

  // Remove tables (markdown and HTML) from any remaining content
  const withoutMarkdownTables = removeMarkdownTables(withBatch2Replaced);
  const withoutTables = removeHtmlTables(withoutMarkdownTables);

  // Extract plain text from the result
  const text = extractPlainText(withoutTables);

  return finalizeSpeechText(text);
}

/** Final cleanup for speech text: normalize whitespace, punctuation, etc. */
function finalizeSpeechText(text: string): string {
  // Replace multiple newlines with periods and spaces
  text = text.replace(/\n{2,}/g, '. ');
  text = text.replace(/\n/g, '. ');

  // Remove table separators (|) for speech
  text = text.replace(/\s*\|\s*/g, ' ');

  // Remove any remaining special characters that might cause issues
  text = text.replace(/[^\w\s.,!?;:()\-'"]/g, ' ');

  // Clean up multiple spaces
  text = text.replace(/\s+/g, ' ');

  // Remove trailing periods/spaces
  text = text.replace(/[.\s]+$/, '');

  // Ensure sentence ends with period for natural speech (but not if empty)
  if (text && text.trim() && !text.match(/[.!?]$/)) {
    text += '.';
  }

  text = text.trim();

  if (!text || text.length < 1 || /^[^\w]+$/.test(text)) return '';

  return text;
}

/**
 * Gets a plain-text preview of message content for chat list display.
 * Parses raw JSON (e.g. {"role":"model","parts":[{"text":"..."}]}) and returns readable snippet.
 * @param content - The message content (may be raw JSON from DB)
 * @param maxLength - Max characters for preview (default 50)
 * @returns Plain text preview, or empty string if content extracts to nothing (caller decides fallback)
 */
export function getMessagePreviewText(content: string | unknown, maxLength = 50): string {
  if (!content) return '';
  const formatted = formatMessageContentForDisplay(content);
  // Use htmlAndMarkdownToPlainText to properly extract text from batch2-response divs
  // (extractPlainText would leave raw JSON when content is batch2 wrapped in div)
  const contentStr = typeof formatted === 'string' ? formatted : String(formatted);
  const plain = htmlAndMarkdownToPlainText(contentStr);
  const trimmed = plain.trim();
  if (!trimmed) return '';
  return trimmed.length > maxLength ? `${trimmed.substring(0, maxLength)}...` : trimmed;
}

/**
 * Gets a plain-text preview for a conversation's chat list display.
 * Prefers the first assistant response (same as shown when opening the conversation).
 * Falls back to last message if no assistant content found.
 * @param conversation - The conversation with messages array
 * @param maxLength - Max characters for preview (default 50)
 * @returns Plain text preview, or "No messages yet" only when truly empty
 */
export function getConversationPreviewText(
  conversation: { messages?: Array<{ role?: string; content?: unknown }> },
  maxLength = 50
): string {
  const messages = conversation.messages || [];
  // Prefer first assistant response (matches what user sees when opening)
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'assistant' || msg.role === 'model') {
      const preview = getMessagePreviewText(msg.content, maxLength);
      if (preview) return preview;
    }
  }
  // Fallback: any message with content
  for (let i = messages.length - 1; i >= 0; i--) {
    const preview = getMessagePreviewText(messages[i].content, maxLength);
    if (preview) return preview;
  }
  return 'No messages yet';
}

/**
 * Extracts plain text optimized for copying to clipboard
 * Preserves lists as bullet lines and tables as text (no HTML tags)
 * Formats raw JSON message content (like UI) before extracting text
 * @param content - The markdown/HTML content to extract text from (may be raw JSON)
 * @returns Plain text optimized for clipboard (no <div>, etc.; lists and tables as text)
 */
export function extractCopyText(content: string | unknown): string {
  if (!content) return '';

  // First format the content (handles raw JSON like {"role":"user","parts":[{"text":"Hello"}]})
  const formattedContent = formatMessageContentForDisplay(content);
  const contentStr = typeof formattedContent === 'string' ? formattedContent : String(formattedContent);

  // Use HTML/markdown → plain text so lists show as bullets and tables as text (no HTML)
  let text = htmlAndMarkdownToPlainText(contentStr);

  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/\s*\|\s*/g, ' | ');

  return text.trim();
}


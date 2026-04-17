/**
 * Extracts a title from markdown content
 * For charts, extracts the chart title from JSON data
 * For tables, extracts the table title or first row
 * For regular content, extracts the first heading or first line
 */
export function extractTitleFromContent(content: string): string {
  if (!content || !content.trim()) {
    return 'Pinned Response';
  }

  // Check if it's chart JSON data
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      // Check if it's a chart object
      if (parsed.type === 'chart' && parsed.title) {
        return parsed.title.length > 50 ? parsed.title.substring(0, 50) + '...' : parsed.title;
      }
      // Check if it's wrapped in batch2-response format
      if (parsed.type === 'batch2' && Array.isArray(parsed.blocks)) {
        const chartBlock = parsed.blocks.find((block: any) => block.type === 'chart');
        if (chartBlock && chartBlock.title) {
          return chartBlock.title.length > 50 ? chartBlock.title.substring(0, 50) + '...' : chartBlock.title;
        }
      }
    }
  } catch {
    // Not JSON, continue with other checks
  }

  // Check if it's a table (markdown table format)
  const tableMatch = content.match(/^\s*\|[^|]+\|/m);
  if (tableMatch) {
    // Try to find a title before the table
    const beforeTable = content.substring(0, content.indexOf('|')).trim();
    if (beforeTable) {
      // Remove markdown formatting
      const cleanTitle = beforeTable
        .replace(/^#+\s*/, '') // Remove headings
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .trim();
      if (cleanTitle && cleanTitle.length > 0) {
        return cleanTitle.length > 50 ? cleanTitle.substring(0, 50) + '...' : cleanTitle;
      }
    }

    // If no title before table, use first header row
    const headerRowMatch = content.match(/^\s*\|([^|]+)\|/m);
    if (headerRowMatch) {
      const headers = headerRowMatch[1]
        .split('|')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
      if (headers.length > 0) {
        return headers[0].length > 50 ? headers[0].substring(0, 50) + '...' : headers[0];
      }
    }

    return 'Table';
  }

  // Try to find a heading (h1, h2, h3)
  const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
  if (headingMatch) {
    const title = headingMatch[1].trim();
    return title.length > 50 ? title.substring(0, 50) + '...' : title;
  }

  // Try to find the first line of text (not empty, not just formatting)
  const lines = content.split('\n');
  for (const line of lines) {
    const cleanLine = line
      .trim()
      .replace(/^#+\s*/, '') // Remove headings
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/^[-*+]\s*/, '') // Remove list markers
      .replace(/^\d+\.\s*/, '') // Remove numbered list markers
      .trim();

    if (cleanLine && cleanLine.length > 3 && !cleanLine.match(/^[|`\-_=]+$/)) {
      return cleanLine.length > 50 ? cleanLine.substring(0, 50) + '...' : cleanLine;
    }
  }

  // Fallback: use first 50 characters
  const fallback = content.trim().substring(0, 50);
  return fallback.length < content.trim().length ? fallback + '...' : fallback;
}


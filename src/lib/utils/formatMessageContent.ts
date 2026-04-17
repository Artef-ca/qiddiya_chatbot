/**
 * Format message content for display in the UI.
 * When content is raw event JSON (stored in DB), parse and return formatted text
 * so the UI shows "how are you" and "Hello! I am..." instead of raw JSON.
 * Normal string content (markdown, text, charts, tables) is returned as-is.
 * Raw batch2 JSON (e.g. from API) is wrapped in batch2-response div so charts render.
 */

/** If content is raw batch2 JSON, wrap in batch2-response div for chart/table rendering. */
function wrapRawBatch2IfNeeded(s: string): string {
  const trimmed = s.trim();
  if (!/^\{\s*"type"\s*:\s*"batch2"/.test(trimmed)) return s;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.type === 'batch2' && Array.isArray(parsed?.blocks)) {
      return `<div data-type="batch2-response">${JSON.stringify({ type: 'batch2', blocks: parsed.blocks })}</div>`;
    }
  } catch {
    // Not valid batch2 JSON, return as-is
  }
  return s;
}

/** Parse inner model response JSON (type, content, suggestions) into display string. */
function parseInnerModelResponse(innerText: string): string {
  if (typeof innerText !== 'string' || !innerText.trim()) return innerText;
  try {
    let cleaned = innerText.trim();
    if (/^json\s+/i.test(cleaned)) {
      cleaned = cleaned.replace(/^json\s+/i, '').trim();
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return innerText;
    const type = parsed.type;
    const content = parsed.content;
    const suggestions = parsed.suggestions;
    // Handle batch2 format: wrap so charts/tables render; keep follow-up suggestions (same as chat stream)
    if (type === 'batch2' && Array.isArray(parsed.blocks)) {
      let out = wrapRawBatch2IfNeeded(cleaned);
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        const escapeHtml = (t: string) =>
          t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        const html = suggestions
          .filter((s: unknown) => s != null)
          .map((s: unknown) => `<button data-type="suggestion">${escapeHtml(String(s))}</button>`)
          .join('\n');
        out += `\n\nTo go further:\n\n<div data-type="suggestions">\n${html}\n</div>`;
      }
      return out;
    }
    if (!type || content == null) return innerText;
    let out = String(content);
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      const escapeHtml = (t: string) =>
        t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      const html = suggestions
        .filter((s: unknown) => s != null)
        .map((s: unknown) => `<button data-type="suggestion">${escapeHtml(String(s))}</button>`)
        .join('\n');
      out += `\n\nTo go further:\n\n<div data-type="suggestions">\n${html}\n</div>`;
    }
    return out;
  } catch {
    return innerText;
  }
}

/**
 * If content is raw event JSON (e.g. {"role":"user","parts":[{"text":"how are you"}]}),
 * return formatted display text. Otherwise return content as-is.
 * Raw batch2 JSON is wrapped so charts/tables render instead of showing raw JSON.
 * Handles both string and object content to never show raw JSON in UI.
 */
export function formatMessageContentForDisplay(content: unknown): string {
  if (content == null) return '';
  // Handle object content (e.g. from API/DB that returns parsed JSON) - parse and extract text, never show raw JSON
  if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
    const obj = content as { role?: string; parts?: Array<{ text?: string }> };
    if (obj.role && Array.isArray(obj.parts)) {
      const role = obj.role === 'user' ? 'user' : obj.role === 'model' ? 'assistant' : 'system';
      const texts = obj.parts
        .map((part) => {
          const raw = part?.text;
          if (raw == null) return null;
          const t = typeof raw === 'string' ? raw : String(raw);
          return role === 'assistant' ? parseInnerModelResponse(t) : t;
        })
        .filter((t): t is string => t != null && t !== '');
      const extracted = texts.join('\n').trim();
      if (extracted) return wrapRawBatch2IfNeeded(extracted);
    }
  }
  if (typeof content !== 'string') return String(content);
  const s = content.trim();
  if (!s.startsWith('{"role":') && !s.startsWith('{"role"')) {
    return wrapRawBatch2IfNeeded(content);
  }
  try {
    const parsed = JSON.parse(s);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.parts)) {
      return wrapRawBatch2IfNeeded(content);
    }
    const role = parsed.role === 'user' ? 'user' : parsed.role === 'model' ? 'assistant' : 'system';
    const texts = parsed.parts
      .map((part: { text?: string }) => {
        const raw = part?.text;
        if (raw == null) return null;
        const t = typeof raw === 'string' ? raw : String(raw);
        return role === 'assistant' ? parseInnerModelResponse(t) : t;
      })
      .filter((t: string | null): t is string => t != null && t !== '');
    const result = texts.join('\n') || content;
    return wrapRawBatch2IfNeeded(result);
  } catch {
    return wrapRawBatch2IfNeeded(content);
  }
}

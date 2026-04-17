import { getPool, isDbConfigured } from '@/lib/db';
import type { Message } from '@/types';

/** Schema where sessions, events, groups, pinned_items tables live (matches your PostgreSQL) */
const SCHEMA = 'qbrain_dev';

/**
 * sessions table row – matches DB sessions table.
 * Columns: app_name, user_id, id, state, create_time, update_time
 */
export type SessionRow = {
  id: string;
  app_name: string | null;
  user_id: string;
  state: string | null;
  create_time: Date | string;
  update_time: Date | string;
};

/**
 * events table row – matches DB events table.
 * Columns: id, app_name, user_id, session_id, invocation_id, author, actions,
 * long_running_tool_ids_json, branch, timestamp, content, grounding_metadata,
 * custom_metadata, usage_metadata, citation_metadata, partial, turn_complete,
 * error_code, error_message, interrupted
 */
export type EventRow = {
  id: string;
  app_name: string;
  user_id: string;
  session_id: string;
  invocation_id: string;
  author: string;
  actions: string;
  long_running_tool_ids_json: string;
  branch: string;
  timestamp: Date | string;
  content: string;
  grounding_metadata: string | null;
  custom_metadata: string | null;
  usage_metadata: string | null;
  citation_metadata: string | null;
  partial: string;
  turn_complete: string;
  error_code: string;
  error_message: string;
  interrupted: string;
  is_flagged?: boolean;
  is_disliked?: boolean;
};

/** Default app_name for sessions and events tables */
export const DEFAULT_APP_NAME = 'qbrain-executive-agent';

/**
 * Parse event content JSON to extract message text
 * Handles the same format as chat API responses with markdown code blocks
 * @param forListPreview - when true, batch2 responses become short plain text (chat list / previews), not rich HTML
 */
function parseEventContent(content: string, forListPreview = false): { role: 'user' | 'assistant' | 'system'; text: string } | null {
  if (typeof content !== 'string' || !content.trim()) return null;
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') return null;

    const role = parsed.role === 'user' ? 'user' : parsed.role === 'model' ? 'assistant' : 'system';
    const parts = Array.isArray(parsed.parts) ? parsed.parts : [];

    const textParts = parts
      .map((part: { text?: string }) => {
        const raw = part?.text;
        if (raw == null) return null;
        const partText = typeof raw === 'string' ? raw : String(raw);
        if (role === 'assistant') {
          return parseModelResponse(partText, forListPreview);
        }
        return partText;
      })
      .filter((t: string | null): t is string => t != null && t !== '');

    const text = textParts.join('\n') || '';
    return { role, text };
  } catch (error) {
    console.error('Error parsing event content:', error);
  }
  return null;
}

/** Append follow-up suggestion cards (same HTML shape as chat stream / non-batch2 responses). */
function appendSuggestionsHtml(formattedResponse: string, suggestions: unknown): string {
  if (suggestions === undefined || suggestions === null || !Array.isArray(suggestions) || suggestions.length === 0) {
    return formattedResponse;
  }
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  const suggestionsHtml = suggestions
    .filter((s: unknown) => s !== null && s !== undefined)
    .map((suggestion: unknown) => `<button data-type="suggestion">${escapeHtml(String(suggestion))}</button>`)
    .join('\n');
  return (
    formattedResponse +
    `\n\nTo go further:\n\n<div data-type="suggestions">\n${suggestionsHtml}\n</div>`
  );
}

/** Plain one-line style preview for batch2 (chat sidebar / last-message preview). */
function batch2BlocksToPlainPreview(blocks: unknown[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    if (b?.type === 'table' && b.headers && b.rows) {
      lines.push((b.headers as string[]).join(' | '));
      for (const row of (b.rows as (string | number)[][]) || []) {
        lines.push(row.map((c) => String(c ?? '')).join(' | '));
      }
    } else if (b?.type === 'chart') {
      lines.push('Chart: ' + (b.title || 'Chart'));
    } else if (b?.type === 'text' || b?.type === 'paragraph') {
      const t = (b.content || '').toString().trim();
      if (t) lines.push(t.replace(/<[^>]+>/g, ''));
    } else if (b?.type === 'paragraph-divider' && Array.isArray(b.paragraphs)) {
      for (const p of b.paragraphs as string[]) {
        const t = (p || '').toString().trim();
        if (t) lines.push(t.replace(/<[^>]+>/g, ''));
      }
    }
  }
  const extracted = lines.join(' ').trim();
  if (extracted) return extracted;
  const firstBlock = blocks[0] as Record<string, unknown> | undefined;
  if (firstBlock?.type === 'chart' && firstBlock.title) return 'Chart: ' + String(firstBlock.title);
  return '';
}

/**
 * Parse model response text - same logic as chat API
 * Handles markdown code blocks and extracts formatted content
 * @param forListPreview - batch2 → plain preview text instead of chart/table HTML
 */
function parseModelResponse(responseString: string, forListPreview = false): string {
  if (typeof responseString !== 'string') {
    return String(responseString);
  }

  try {
    // Step 1: Clean the response string - handle multiple formats:
    // Format 1: Plain JSON: "{\n \"type\": ...}"
    // Format 2: Markdown code block: "```json\n{...}\n```"
    // Format 3: API prefix (e.g. Gemini): "json\n{\n \"type\": ...}" or "json\n{...}"
    let cleanedString = responseString.trim();

    // Strip leading "json" + newline/space (API sometimes returns this prefix)
    if (/^json\s+/i.test(cleanedString)) {
      cleanedString = cleanedString.replace(/^json\s+/i, '').trim();
    }

    // Check if it's wrapped in markdown code blocks
    const hasMarkdownCodeBlock = cleanedString.startsWith('```') || cleanedString.includes('```json');

    if (hasMarkdownCodeBlock) {
      // Remove markdown code block markers (```json ... ```)
      cleanedString = cleanedString.replace(/^```json\s*/i, '');
      cleanedString = cleanedString.replace(/^```\s*/i, '');
      cleanedString = cleanedString.replace(/\s*```$/i, '');
      cleanedString = cleanedString.trim();
    }

    // Parse the JSON string (JSON.parse handles escaped newlines \n automatically)
    const parsedResponse = JSON.parse(cleanedString);

    // Extract content and suggestions
    if (parsedResponse && typeof parsedResponse === 'object') {
      const type = parsedResponse.type;
      const content = parsedResponse.content;
      const suggestions = parsedResponse.suggestions;
      const blocks = parsedResponse.blocks;

      // batch2: rich HTML for chat transcript; plain text for list previews only
      if (type === 'batch2' && Array.isArray(blocks)) {
        if (forListPreview && blocks.length > 0) {
          return batch2BlocksToPlainPreview(blocks);
        }
        const batch2Html = `<div data-type="batch2-response">${JSON.stringify({ type: 'batch2', blocks })}</div>`;
        return appendSuggestionsHtml(batch2Html, suggestions);
      }

      // Validate we have type and content
      if (type && content !== undefined && content !== null) {
        // Start with the content (skip if content is object for batch2 - already handled above)
        const contentStr = typeof content === 'string' ? content : (typeof content === 'object' ? '' : String(content));

        return appendSuggestionsHtml(contentStr, suggestions);
      } else {
        // If parsing fails, return the original text
        return responseString;
      }
    } else {
      // If parsed response is not an object, return original
      return responseString;
    }
  } catch (parseError) {
    // If parsing fails, return the original text
    console.error('Error parsing model response:', parseError);
    return responseString;
  }
}

/**
 * Map event author to message role
 */
function mapAuthorToRole(author: string): 'user' | 'assistant' | 'system' {
  if (author === 'user') return 'user';
  if (author === 'root_agent' || author === 'model') return 'assistant';
  return 'system';
}

/**
 * Get all sessions (conversations) for a user
 */
export async function getSessions(userId: string): Promise<SessionRow[]> {
  if (!isDbConfigured()) {
    return [];
  }

  const pool = getPool();
  const result = (await pool.query(
    `SELECT id, app_name, user_id, state, create_time, update_time
     FROM ${SCHEMA}.sessions
     WHERE user_id = $1
     ORDER BY update_time DESC`,
    [userId]
  )) as { rows: SessionRow[] };

  return result.rows || [];
}

/**
 * Get a single session by ID
 */
export async function getSessionById(sessionId: string, userId: string): Promise<SessionRow | null> {
  if (!isDbConfigured()) {
    return null;
  }

  const pool = getPool();
  const result = (await pool.query(
    `SELECT id, app_name, user_id, state, create_time, update_time
     FROM ${SCHEMA}.sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  )) as { rows: SessionRow[] };

  return result.rows?.[0] || null;
}

/**
 * Get all events (messages) for a session.
 * Events table: author = "user" for user query, "root_agent" for bot response;
 * content = JSON with role "user"|"model" and parts[].text (bot text formatted via parseModelResponse for UI).
 * Returns events in chronological order for display.
 */
export async function getEvents(sessionId: string): Promise<Message[]> {
  if (!isDbConfigured()) {
    return [];
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT id, session_id, author, timestamp, content,
            COALESCE(is_pro, false) as is_pro,
            COALESCE(is_flagged, false) as is_flagged,
            COALESCE(is_disliked, false) as is_disliked
     FROM ${SCHEMA}.events
     WHERE session_id = $1
     ORDER BY timestamp ASC`,
    [sessionId]
  );

  const messages: Message[] = [];

  for (const row of (result.rows || []) as Array<{
    id: string;
    author: string;
    timestamp: Date | string;
    content: string;
    is_pro: boolean;
    is_flagged: boolean;
    is_disliked: boolean;
  }>) {
    const author = row.author;
    const content = row.content;
    const isPro = row.is_pro === true;

    // Parse content to extract text
    const parsed = parseEventContent(content);

    if (parsed) {
      messages.push({
        id: row.id,
        role: parsed.role,
        content: parsed.text,
        timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
        isLoading: false, // Explicitly set to false for loaded messages (no typing animation)
        hasError: false,
        ...(parsed.role === 'assistant' && { is_pro: isPro }),
        isFlagged: row.is_flagged === true,
        isDisliked: row.is_disliked === true,
      });
    } else {
      // Fallback: use author to determine role
      messages.push({
        id: row.id,
        role: mapAuthorToRole(author),
        content: content || '',
        timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
        isLoading: false, // Explicitly set to false for loaded messages (no typing animation)
        hasError: false,
        ...(mapAuthorToRole(author) === 'assistant' && { is_pro: isPro }),
        isFlagged: row.is_flagged === true,
        isDisliked: row.is_disliked === true,
      });
    }
  }

  return messages;
}

const PREVIEW_MAX_LENGTH = 50;

/**
 * Get the first assistant response (as plain preview text) for each session.
 * Uses the FIRST query response so the list shows the same content as when opening the conversation.
 * All conversations have responses, so we only need assistant events.
 */
export async function getLastEventPreviewsForSessions(
  userId: string,
  sessionIds: string[]
): Promise<Record<string, string>> {
  if (!isDbConfigured() || sessionIds.length === 0) {
    return {};
  }

  const pool = getPool();
  // Use FIRST assistant (root_agent) event - the first response, same as shown when opening conversation
  const assistantResult = await pool.query(
    `SELECT DISTINCT ON (session_id) session_id, content
     FROM ${SCHEMA}.events
     WHERE session_id = ANY($1)
       AND session_id IN (SELECT id FROM ${SCHEMA}.sessions WHERE user_id = $2)
       AND author IN ('root_agent', 'model')
     ORDER BY session_id, timestamp ASC`,
    [sessionIds, userId]
  );

  const previews: Record<string, string> = {};
  for (const row of (assistantResult.rows || []) as Array<{ session_id: string; content: string }>) {
    const parsed = parseEventContent(row.content, true);
    if (parsed?.text) {
      const text = parsed.text.trim().replace(/\s+/g, ' ');
      if (text) {
        const preview =
          text.length > PREVIEW_MAX_LENGTH
            ? `${text.substring(0, PREVIEW_MAX_LENGTH)}...`
            : text;
        previews[row.session_id] = preview;
      }
    }
  }
  return previews;
}

/**
 * Ensure a session exists in DB (e.g. when Google API returns a session_id we need to persist).
 * Inserts a row with the given id if it does not exist.
 */
export async function ensureSessionExists(
  sessionId: string,
  userId: string,
  appName: string = DEFAULT_APP_NAME
): Promise<void> {
  if (!isDbConfigured()) {
    return;
  }
  const pool = getPool();
  const existing = await getSessionById(sessionId, userId);
  if (existing) {
    return;
  }
  await pool.query(
    `INSERT INTO ${SCHEMA}.sessions (id, app_name, user_id, state, create_time, update_time)
     VALUES ($1, $2, $3, '{}', now(), now())
     ON CONFLICT (id) DO NOTHING`,
    [sessionId, appName, userId]
  );
}

/**
 * Insert an event (user message or assistant response) for a session.
 * Events table: author column = "user" for user query, "root_agent" for bot response.
 * Content column = JSON string:
 *   - User: {"role": "user", "parts": [{"text": "hello?"}]}
 *   - Bot:  {"role": "model", "parts": [{"text": "```json\n{...}\n```"}]} (raw bot response for UI formatting)
 */
export async function insertEvent(
  sessionId: string,
  userId: string,
  author: 'user' | 'model' | 'root_agent',
  textContent: string,
  appName: string = DEFAULT_APP_NAME,
  isPro: boolean = false
): Promise<string | null> {
  if (!isDbConfigured()) {
    console.warn('[insertEvent] Database not configured, skipping event insertion');
    return null;
  }

  if (!sessionId || !userId) {
    console.error('[insertEvent] Missing required parameters:', { sessionId, userId });
    return null;
  }
  // Allow empty user message; normalize to string and cap size to avoid DB limits
  const safeText = typeof textContent === 'string' ? textContent : String(textContent ?? '');
  const MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB safety limit for content column
  const truncatedText = safeText.length > MAX_CONTENT_LENGTH
    ? safeText.slice(0, MAX_CONTENT_LENGTH) + '...[truncated]'
    : safeText;

  try {
    const role = author === 'root_agent' ? 'model' : author;
    const content = JSON.stringify({
      role,
      parts: [{ text: truncatedText }],
    });

    const eventId = crypto.randomUUID();
    const invocationId = `e-${crypto.randomUUID()}`;
    const pool = getPool();
    const params = [
      eventId,             // $1 - id (NOT NULL, no default in table)
      appName,             // $2 - app_name
      userId,              // $3 - user_id
      sessionId,           // $4 - session_id
      invocationId,        // $5 - invocation_id
      author,              // $6 - author
      '',                  // $7 - actions (text)
      '',                  // $8 - long_running_tool_ids_json (text)
      '',                  // $9 - branch (text)
      content,             // $10 - content
      null,                // $11 - grounding_metadata (JSONB)
      null,                // $12 - custom_metadata (JSONB)
      null,                // $13 - usage_metadata (JSONB)
      null,                // $14 - citation_metadata (JSONB)
      false,               // $15 - partial (boolean)
      false,               // $16 - turn_complete (boolean)
      null,                // $17 - error_code (text)
      null,                // $18 - error_message (text)
      false,               // $19 - interrupted (boolean)
      isPro,               // $20 - is_pro (user: from request; root_agent: from API response)
    ];

    console.log('[insertEvent] Inserting event:', {
      eventId,
      sessionId,
      userId,
      author,
      contentLength: textContent.length,
      invocationId,
      isPro,
    });

    // Column id is NOT NULL with no default - must be provided
    const insertColumns = `id, app_name, user_id, session_id, invocation_id, author, actions,
      long_running_tool_ids_json, branch, timestamp, content,
      grounding_metadata, custom_metadata, usage_metadata, citation_metadata,
      partial, turn_complete, error_code, error_message, interrupted, is_pro`;
    const insertValues = `$1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10,
      $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20`;

    await pool.query(
      `INSERT INTO ${SCHEMA}.events (${insertColumns})
       VALUES (${insertValues})`,
      params
    );

    console.log('[insertEvent] Event inserted successfully:', eventId);
    return eventId;
  } catch (error) {
    console.error('[insertEvent] Error inserting event:', error);
    console.error('[insertEvent] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      sessionId,
      userId,
      author,
    });
    return null;
  }
}

/**
 * Delete the last assistant (root_agent/model) event for a session.
 * Used when regenerating or renaming a query – replaces old response with new one.
 */
export async function deleteLastAssistantEvent(
  sessionId: string,
  userId: string
): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const pool = getPool();
  const result = await pool.query(
    `WITH to_delete AS (
      SELECT id FROM ${SCHEMA}.events
      WHERE session_id = $1 AND user_id = $2 AND author IN ('root_agent', 'model')
      ORDER BY timestamp DESC
      LIMIT 1
    )
    DELETE FROM ${SCHEMA}.events WHERE id IN (SELECT id FROM to_delete)
    RETURNING id`,
    [sessionId, userId]
  );
  return (result.rows?.length ?? 0) > 0;
}

/**
 * Update the last user event's content (used when user renames/edits their query).
 */
export async function updateLastUserEventContent(
  sessionId: string,
  userId: string,
  newContent: string
): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const safeText = typeof newContent === 'string' ? newContent : String(newContent ?? '');
  const MAX_CONTENT_LENGTH = 1024 * 1024;
  const truncatedText =
    safeText.length > MAX_CONTENT_LENGTH ? safeText.slice(0, MAX_CONTENT_LENGTH) + '...[truncated]' : safeText;
  const content = JSON.stringify({ role: 'user', parts: [{ text: truncatedText }] });
  const pool = getPool();
  const result = await pool.query(
    `UPDATE ${SCHEMA}.events
     SET content = $3
     WHERE id = (
       SELECT id FROM ${SCHEMA}.events
       WHERE session_id = $1 AND user_id = $2 AND author = 'user'
       ORDER BY timestamp DESC
       LIMIT 1
     )
     RETURNING id`,
    [sessionId, userId, content]
  );
  return (result.rows?.length ?? 0) > 0;
}

/**
 * Create a new session with a UUID (client and DB use only UUID; Chat API session id lives in state.chatApiSessionId).
 */
export async function createSession(userId: string, appName: string = DEFAULT_APP_NAME): Promise<SessionRow | null> {
  if (!isDbConfigured()) {
    throw new Error('Database not configured');
  }

  const id = crypto.randomUUID();
  const pool = getPool();
  const result = (await pool.query(
    `INSERT INTO ${SCHEMA}.sessions (id, app_name, user_id, state, create_time, update_time)
     VALUES ($1, $2, $3, '{}', now(), now())
     RETURNING id, app_name, user_id, state, create_time, update_time`,
    [id, appName, userId]
  )) as { rows: SessionRow[] };

  return result.rows?.[0] || null;
}

/**
 * Update session update_time
 */
export async function updateSessionTimestamp(sessionId: string) {
  if (!isDbConfigured()) {
    return;
  }

  const pool = getPool();
  await pool.query(
    `UPDATE ${SCHEMA}.sessions
     SET update_time = now()
     WHERE id = $1`,
    [sessionId]
  );
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string, userId: string) {
  if (!isDbConfigured()) {
    throw new Error('Database not configured');
  }

  const pool = getPool();
  const result = await pool.query(
    `DELETE FROM ${SCHEMA}.sessions
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [sessionId, userId]
  );

  return result.rows.length > 0;
}

/**
 * Get title for a session: uses title override in session.state if set,
 * otherwise first user message from events (matches Session.json + event.json schema).
 */
export async function getSessionTitle(sessionId: string): Promise<string> {
  if (!isDbConfigured()) {
    return 'New Conversation';
  }

  const pool = getPool();
  // Check for title override in session state (e.g. user-renamed chat)
  const sessionResult = await pool.query(
    `SELECT state FROM ${SCHEMA}.sessions WHERE id = $1`,
    [sessionId]
  );
  const sessionRow = sessionResult.rows?.[0] as { state: string | null } | undefined;
  if (sessionRow?.state) {
    try {
      const state = typeof sessionRow.state === 'string' ? JSON.parse(sessionRow.state) : sessionRow.state;
      if (state && typeof state.title === 'string' && state.title.trim()) {
        return state.title.trim();
      }
    } catch {
      // ignore invalid JSON
    }
  }

  // Fallback: first user message from events
  const result = await pool.query(
    `SELECT content, author
     FROM ${SCHEMA}.events
     WHERE session_id = $1 AND author = 'user'
     ORDER BY timestamp ASC
     LIMIT 1`,
    [sessionId]
  );

  if (result.rows.length > 0) {
    const row = result.rows[0] as { content: string };
    const content = row.content;
    const parsed = parseEventContent(content);
    if (parsed && parsed.text) {
      const title = parsed.text.trim();
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
  }

  return 'New Conversation';
}

/**
 * Update session title (stored in session state; used when user renames a chat).
 * sessions table has state JSON – we set state.title for override.
 */
export async function updateSessionTitle(
  sessionId: string,
  userId: string,
  title: string
): Promise<void> {
  if (!isDbConfigured()) {
    return;
  }
  const pool = getPool();
  await pool.query(
    `UPDATE ${SCHEMA}.sessions
     SET state = jsonb_set(COALESCE(state::jsonb, '{}'::jsonb), '{title}', to_jsonb($2::text)), update_time = now()
     WHERE id = $1 AND user_id = $3`,
    [sessionId, title.trim(), userId]
  );
}

/**
 * Set session title from the first user message (auto-title from query).
 * Only sets if current title is missing or "New Conversation" so user renames are preserved.
 */
export async function ensureSessionTitleFromFirstMessage(
  sessionId: string,
  userId: string,
  message: string
): Promise<void> {
  if (!isDbConfigured() || !message?.trim()) {
    return;
  }
  const currentTitle = await getSessionTitle(sessionId);
  if (currentTitle && currentTitle !== 'New Conversation') {
    return; // User already renamed or title was set
  }
  const title = message.trim();
  const truncated = title.length > 50 ? title.substring(0, 50) + '...' : title;
  await updateSessionTitle(sessionId, userId, truncated);
}

/** Key in session.state for star (no DB column; store in state JSON: star = false | true). */
const STATE_KEY_STAR = 'star';

/**
 * Get starred flag from session state (sessions.state.star).
 * Default false when not set.
 */
export async function getSessionStarred(sessionId: string): Promise<boolean> {
  if (!isDbConfigured()) {
    return false;
  }
  const pool = getPool();
  const result = await pool.query(
    `SELECT state FROM ${SCHEMA}.sessions WHERE id = $1`,
    [sessionId]
  );
  const row = result.rows?.[0] as { state: string | Record<string, unknown> | null } | undefined;
  if (!row?.state) return false;
  try {
    const state = typeof row.state === 'string' ? JSON.parse(row.state) : row.state;
    return state?.[STATE_KEY_STAR] === true;
  } catch {
    return false;
  }
}

/**
 * Update session star flag in state (sessions.state.star).
 * Toggle star/unstar: false -> true, true -> false.
 */
export async function updateSessionStarred(
  sessionId: string,
  userId: string,
  starred: boolean
): Promise<void> {
  if (!isDbConfigured()) {
    return;
  }
  const pool = getPool();
  await pool.query(
    `UPDATE ${SCHEMA}.sessions
     SET state = jsonb_set(COALESCE(state::jsonb, '{}'::jsonb), '{${STATE_KEY_STAR}}', to_jsonb($2::boolean)), update_time = now()
     WHERE id = $1 AND user_id = $3`,
    [sessionId, starred, userId]
  );
}

/** Key in session.state for the Chat API session id (used only when calling the Chat API). */
const STATE_KEY_CHAT_API_SESSION_ID = 'chatApiSessionId';

/**
 * Get the Chat API session id from session state (for continuing conversations with the Chat API).
 * Returns null if not set (e.g. new session before first API response).
 */
export async function getChatApiSessionId(
  sessionId: string,
  userId: string
): Promise<string | null> {
  if (!isDbConfigured() || !sessionId) {
    return null;
  }
  const pool = getPool();
  const result = await pool.query(
    `SELECT state FROM ${SCHEMA}.sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  const row = result.rows?.[0] as { state: string | Record<string, unknown> | null } | undefined;
  if (!row?.state) return null;
  try {
    const state = typeof row.state === 'string' ? JSON.parse(row.state) : row.state;
    const id = state?.[STATE_KEY_CHAT_API_SESSION_ID];
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

/**
 * Store the Chat API session id in session state (after first API response).
 * Used only for reference and when calling the Chat API to continue the conversation.
 */
export async function setChatApiSessionId(
  sessionId: string,
  userId: string,
  chatApiSessionId: string
): Promise<void> {
  if (!isDbConfigured() || !sessionId || !chatApiSessionId) {
    return;
  }
  const pool = getPool();
  await pool.query(
    `UPDATE ${SCHEMA}.sessions
     SET state = jsonb_set(COALESCE(state::jsonb, '{}'::jsonb), '{${STATE_KEY_CHAT_API_SESSION_ID}}', to_jsonb($2::text)), update_time = now()
     WHERE id = $1 AND user_id = $3`,
    [sessionId, chatApiSessionId, userId]
  );
}

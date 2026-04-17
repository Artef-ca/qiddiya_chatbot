/**
 * Chat stream API – UUID everywhere; Chat API session id in sessions.state.
 *
 * 1. Client and DB use only UUID (URL /chat/<uuid>, list, pinned, groups).
 * 2. Chat API session id is stored in sessions.state.chatApiSessionId and sent to the API for continuing chats.
 * 3. First event sends our UUID so client sets URL to /chat/<uuid> (or renames temp id to UUID).
 * 4. Live chat: client shows response from this stream (spinner + auto-type). We store user query and bot
 *    response in events table (author: user / root_agent, content: JSON) so refresh/open conversation
 *    loads from GET /api/conversations/:id → getEvents() with formatted text/table/chart.
 *
 * Chat API can take up to 90–100 seconds to respond; maxDuration allows the route to wait without timeout.
 */
import { NextRequest } from 'next/server';

/** Allow up to 120s for Chat API (can take 90–100s); keep-alive prevents proxy/LB timeout. */
export const maxDuration = 120;
import type { ChatRequest } from '@/types';
import { getSessionFromRequest } from '@/lib/auth/session';
import { updateConversationSessionId } from '@/lib/utils/conversation';
import { getGcpAccessToken, clearTokenCache } from '@/lib/gcp/auth';
import {
  ensureSessionExists,
  insertEvent,
  getChatApiSessionId,
  setChatApiSessionId,
  createSession,
  deleteLastAssistantEvent,
  updateLastUserEventContent,
  DEFAULT_APP_NAME,
} from '@/lib/db/sessions';
import { isUUID } from '@/lib/utils/id';

// Google Cloud AI Platform API configuration
const GOOGLE_CLOUD_API_URL = process.env.GOOGLE_CLOUD_API_URL ||
  'https://europe-west1-aiplatform.googleapis.com/v1/projects/prj-ai-dev-qic/locations/europe-west1/reasoningEngines/3614077128313667584:query';

/**
 * Inner `output.response` JSON often omits `suggestions` when they only exist on `output.suggestions`.
 * The stream merges those for the client; without the same merge here, persisted events lose suggestions and
 * a background refetch (upsertConversation) replaces the UI with cards missing.
 */
function buildModelEventStorageText(rawInnerResponse: string, mergedSuggestions: string[]): string {
  const trimmed = typeof rawInnerResponse === 'string' ? rawInnerResponse.trim() : '';
  if (!trimmed || !mergedSuggestions.length) return rawInnerResponse;

  try {
    let cleaned = trimmed;
    if (/^json\s+/i.test(cleaned)) {
      cleaned = cleaned.replace(/^json\s+/i, '').trim();
    }
    if (cleaned.startsWith('```') || cleaned.includes('```json')) {
      cleaned = cleaned
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    }
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return rawInnerResponse;
    parsed.suggestions = mergedSuggestions;
    return JSON.stringify(parsed);
  } catch {
    return rawInnerResponse;
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationId, title: titleFromClient, is_pro: isPro, isRetry } = body;

    // Log at entry – requestId + isRetry help trace first attempt vs retry when debugging intermittent failures
    console.log('[Chat Stream] Request received:', {
      requestId,
      isRetry: !!isRetry,
      conversationId,
      messageLength: message?.length,
      queryPreview: typeof message === 'string' ? message.slice(0, 80) : '(non-string)',
      hasHistory: Array.isArray((body as { history?: unknown }).history),
      historyLength: Array.isArray((body as { history?: unknown[] }).history) ? (body as { history: unknown[] }).history.length : 0,
    });

    // Get user session to extract user ID
    const session = await getSessionFromRequest(request);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      );
    }

    const userId = session.userId || session.email || 'unknown-user';

    // UUID everywhere: client and DB use only UUID; Chat API session id lives in sessions.state.chatApiSessionId.
    const { isDbConfigured } = await import('@/lib/db');
    const dbConfigured = isDbConfigured();
    console.log('[Chat Stream] Database configured:', dbConfigured);
    
    const isTempId =
      !conversationId ||
      conversationId.startsWith('conv-') ||
      conversationId.startsWith('new-');
    let ourSessionId: string;
    if (isTempId && dbConfigured) {
      const newSession = await createSession(userId);
      ourSessionId = newSession?.id ?? crypto.randomUUID();
      console.log('[Chat Stream] Created new session:', ourSessionId);
    } else {
      ourSessionId = conversationId!;
      console.log('[Chat Stream] Using existing session:', ourSessionId);
    }
    
    // Ensure session exists and insert user event BEFORE calling API (skip on retry/regenerate - user message already exists)
    if (dbConfigured && ourSessionId && !isRetry) {
      try {
        console.log('[Chat Stream] Ensuring session exists and inserting user event...', { ourSessionId, userId, messageLength: message.length });
        await ensureSessionExists(ourSessionId, userId);
        console.log('[Chat Stream] Session ensured:', ourSessionId);
        
        // Insert user event immediately (before API call); store is_pro from request (pro toggle state)
        const userEventId = await insertEvent(ourSessionId, userId, 'user', message, DEFAULT_APP_NAME, isPro === true);
        if (userEventId) {
          console.log('[Chat Stream] User event inserted successfully:', userEventId);
        } else {
          console.error('[Chat Stream] Failed to insert user event - insertEvent returned null. Check database connection and event table.');
        }
        
        // Update title from client if provided
        if (titleFromClient && typeof titleFromClient === 'string' && titleFromClient.trim()) {
          const { updateSessionTitle } = await import('@/lib/db/sessions');
          await updateSessionTitle(ourSessionId, userId, titleFromClient.trim().slice(0, 50));
          console.log('[Chat Stream] Session title updated from client:', titleFromClient.trim().slice(0, 50));
        }
      } catch (err) {
        console.error('[Chat Stream] Error ensuring session or inserting user event:', err);
        console.error('[Chat Stream] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
        // Continue anyway - don't block the API call
      }
    } else {
      console.warn('[Chat Stream] Skipping event insertion:', { dbConfigured, ourSessionId });
    }
    const sessionIdForApi = (await getChatApiSessionId(ourSessionId, userId)) ?? '';

    // Log session lookup result (helps debug 403 on 2nd message in deployed app)
    console.log('[Chat Stream] Session lookup:', {
      ourSessionId,
      userId,
      hasChatApiSessionId: !!sessionIdForApi,
      sessionIdForApiPreview: sessionIdForApi ? `${sessionIdForApi.substring(0, 30)}...` : '(empty)',
    });

    // Get GCP access token for Chat API authentication
    // Note: Chat API requires GCP token, not Azure token
    let gcpToken: string;
    try {
      gcpToken = await getGcpAccessToken();
    } catch (error) {
      console.error('Failed to get GCP access token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with GCP service' }),
        { status: 500 }
      );
    }

    // Prepare request body for Google Cloud API
    // Format: { input: { request: { query, sessionid, userid, is_pro } } }
    const requestBody = {
      input: {
        request: {
          query: message,
          sessionid: sessionIdForApi, // '' for new; Chat API session id from state for continuing
          userid: userId,
          is_pro: isPro === true, // Pro mode: default false, true when user enables toggle
        },
      },
    };

    console.log('[Chat Stream] Calling Google Cloud API:', {
      url: GOOGLE_CLOUD_API_URL,
      userId,
      hasSessionId: !!sessionIdForApi,
      sessionIdLength: sessionIdForApi?.length ?? 0,
      messageLength: message.length,
    });

    // Return stream immediately so client gets 200 + first byte within 1–2s.
    // Prevents proxy/load balancer timeout when Google API takes 45+ seconds.
    // Keep-alive sent every 15s while waiting for Google API.
    const KEEP_ALIVE_INTERVAL_MS = 15_000;
    const encoder = new TextEncoder();
    const sendKeepAlive = (c: ReadableStreamDefaultController<Uint8Array>) => {
      c.enqueue(encoder.encode(': keep-alive\n\n'));
    };

    const stream = new ReadableStream({
      async start(controller) {
        const sendError = (errMsg: string, status?: number) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg, status })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        };

        sendKeepAlive(controller);
        const keepAliveId = setInterval(() => sendKeepAlive(controller), KEEP_ALIVE_INTERVAL_MS);

        // Used to tell the client the real DB event id for this assistant response.
        // This lets the UI persist flag/dislike immediately without waiting for a refresh.
        let modelEventIdForClient: string | null = null;

        try {
          let apiResponse = await fetch(GOOGLE_CLOUD_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${gcpToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('[Chat Stream] API Response status:', apiResponse.status, '| requestId:', requestId, '| elapsedMs:', Date.now() - startTime);
          clearInterval(keepAliveId);

          if (apiResponse.status === 401) {
            console.warn('[Chat Stream] Received 401, refreshing GCP token and retrying...');
            try {
              clearTokenCache();
              const refreshedToken = await getGcpAccessToken(true);
              apiResponse = await fetch(GOOGLE_CLOUD_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${refreshedToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
              });
              console.log('[Chat Stream] Retry response status:', apiResponse.status);
            } catch (refreshError) {
              console.error('[Chat Stream] Failed to refresh token:', refreshError);
              sendError('Failed to refresh GCP access token', 401);
              return;
            }
          }

          if (apiResponse.status === 403 && sessionIdForApi) {
            console.warn('[Chat Stream] Received 403 with sessionId – retrying with empty session – requestId:', requestId);
            const retryBody = { input: { request: { query: message, sessionid: '', userid: userId, is_pro: isPro === true } } };
            apiResponse = await fetch(GOOGLE_CLOUD_API_URL, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${gcpToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(retryBody),
            });
            console.log('[Chat Stream] 403 retry response status:', apiResponse.status, '| requestId:', requestId, '| success:', apiResponse.ok);
          }

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            let parsedError: { error?: string; message?: string } | null = null;
            try { parsedError = JSON.parse(errorText) as { error?: string; message?: string }; } catch { /* ignore */ }
            const apiErrorMessage = (parsedError?.message ?? parsedError?.error ?? errorText?.slice(0, 500)) || apiResponse.statusText;
            console.error('[Chat Stream] Google Cloud API error – requestId:', requestId, '| status:', apiResponse.status, '| errorBody:', errorText?.slice(0, 1000));
            sendError(apiErrorMessage || `API error: ${apiResponse.status}`, apiResponse.status || 500);
            return;
          }

          // Step 1: Get raw text first, then parse. session_id can be a large number (>2^53) — JSON.parse
          // would corrupt it. Extract from raw text to preserve exact digits.
          const rawText = await apiResponse.text();
          type ApiDataShape = { output?: { session_id?: unknown; sessionId?: unknown; sessionid?: unknown; response?: string; suggestions?: string[]; is_pro?: boolean } };
          let apiData: ApiDataShape;
          try {
            apiData = JSON.parse(rawText) as ApiDataShape;
          } catch (parseErr) {
            const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            console.error('[Chat Stream] Failed to parse Google API response as JSON – requestId:', requestId, '| rawPreview:', rawText?.slice(0, 500), '| parseError:', msg);
            sendError(`Invalid API response: ${msg}`, 500);
            return;
          }
    console.log('[Chat Stream] Step 1 - Main API Response | requestId:', requestId, '| elapsedMs:', Date.now() - startTime);

    // Step 2: Extract session_id from raw text to avoid JS number precision loss (session_id > 2^53)
    // Match "session_id":"3185309924678696960" (string) or "session_id":3185309924678696960 (number)
    const sessionIdMatch = rawText.match(/"session_id"\s*:\s*"([^"]+)"|"session_id"\s*:\s*(\d+)|"sessionId"\s*:\s*"([^"]+)"|"sessionId"\s*:\s*(\d+)/i);
    let apiSessionId: string | undefined =
      sessionIdMatch?.[1] ?? sessionIdMatch?.[2] ?? sessionIdMatch?.[3] ?? sessionIdMatch?.[4];
    if (!apiSessionId) {
      const fromParsed = apiData.output?.session_id ?? apiData.output?.sessionId ?? apiData.output?.sessionid;
      apiSessionId = fromParsed != null ? String(fromParsed) : undefined;
    }
    if (apiSessionId) {
      await setChatApiSessionId(ourSessionId, userId, apiSessionId);
    }
    const sessionIdToSend = isUUID(ourSessionId) ? ourSessionId : null;
    console.log('[Chat Stream] Step 2 - API session_id stored in state; client sessionId (UUID):', sessionIdToSend ?? ourSessionId);

    // Step 3: Parse the "response" key from output (it's a JSON string)
    let responseData: { type?: string; content?: string; suggestions?: string[] } | null = null;
    /** Raw API response string for persisting as model event (same format parseModelResponse expects) */
    let rawModelResponseString = '';

    if (!apiData.output) {
      console.error('[Chat Stream] ERROR: No output found in API response | requestId:', requestId);
    } else if (!apiData.output.response) {
      console.error('[Chat Stream] ERROR: No response key found in output | requestId:', requestId, '| availableKeys:', Object.keys(apiData.output));
    } else {
      const responseString = apiData.output.response;
      if (typeof responseString === 'string') {
        rawModelResponseString = responseString;
      }
      console.log('[Chat Stream] Step 3 - Response string type:', typeof responseString);
      console.log('[Chat Stream] Step 3 - Response string value:', responseString);

      if (typeof responseString !== 'string') {
        console.error('[Chat Stream] ERROR: output.response is not a string, it is:', typeof responseString);
      } else {
        try {
          // Step 4: Clean the response string - handle formats:
          // Format 1: Plain JSON: "{\n \"type\": ...}"
          // Format 2: Markdown code block: "```json\n{...}\n```"
          // Format 3: API prefix (e.g. Gemini): "json\n{\n \"type\": ...}"
          let cleanedString = responseString.trim();
          if (/^json\s+/i.test(cleanedString)) {
            cleanedString = cleanedString.replace(/^json\s+/i, '').trim();
          }

          // Check if it's wrapped in markdown code blocks
          const hasMarkdownCodeBlock = cleanedString.startsWith('```') || cleanedString.includes('```json');

          if (hasMarkdownCodeBlock) {
            console.log('[Chat Stream] Step 4 - Detected markdown code block format');
            // Remove markdown code block markers (```json ... ```)
            // Handle both ```json and ``` markers
            cleanedString = cleanedString.replace(/^```json\s*/i, ''); // Remove opening ```json
            cleanedString = cleanedString.replace(/^```\s*/i, ''); // Remove opening ``` if no json
            cleanedString = cleanedString.replace(/\s*```$/i, ''); // Remove closing ```
            cleanedString = cleanedString.trim();
          } else {
            console.log('[Chat Stream] Step 4 - Detected plain JSON string format (with escaped newlines)');
            // Plain JSON string - JSON.parse will handle escaped newlines automatically
          }

          console.log('[Chat Stream] Step 4 - Cleaned string (first 200 chars):', cleanedString.substring(0, 200));

          // Parse the JSON string (JSON.parse handles escaped newlines \n automatically)
          const parsedResponse = JSON.parse(cleanedString);
          console.log('[Chat Stream] Step 4 - Parsed response:', JSON.stringify(parsedResponse, null, 2));

          // Step 5: Extract content and suggestions
          if (parsedResponse && typeof parsedResponse === 'object') {
            const type = parsedResponse.type;
            let content = parsedResponse.content;
            let suggestions = parsedResponse.suggestions;

            // Handle batch2 format: { type: "batch2", blocks: [...] } — no content field
            // UI expects: <div data-type="batch2-response">${JSON.stringify({ type, blocks })}</div>
            if (type === 'batch2' && parsedResponse.blocks && Array.isArray(parsedResponse.blocks) && (content === undefined || content === null)) {
              content = `<div data-type="batch2-response">${JSON.stringify({ type: 'batch2', blocks: parsedResponse.blocks })}</div>`;
              console.log('[Chat Stream] Step 5 - Constructed batch2 content from blocks');
            }
            // Handle content field that is batch2 JSON string (e.g. API returns nested structure)
            else if (typeof content === 'string' && content.trim()) {
              try {
                const contentParsed = JSON.parse(content.trim());
                if (contentParsed?.type === 'batch2' && Array.isArray(contentParsed?.blocks)) {
                  content = `<div data-type="batch2-response">${JSON.stringify({ type: 'batch2', blocks: contentParsed.blocks })}</div>`;
                  console.log('[Chat Stream] Step 5 - Wrapped batch2 JSON from content field');
                }
              } catch {
                // content is not batch2 JSON, use as-is
              }
            }

            // Use top-level output.suggestions when not present in parsed response
            if ((suggestions === undefined || suggestions === null || !Array.isArray(suggestions)) && apiData.output?.suggestions && Array.isArray(apiData.output.suggestions)) {
              suggestions = apiData.output.suggestions;
              console.log('[Chat Stream] Step 5 - Using suggestions from output.suggestions');
            }

            console.log('[Chat Stream] Step 5 - Extracted values:', {
              type: type,
              content: content ? `${String(content).substring(0, 50)}...` : content,
              contentLength: content ? String(content).length : 0,
              suggestionsType: typeof suggestions,
              suggestionsIsArray: Array.isArray(suggestions),
              suggestionsLength: Array.isArray(suggestions) ? suggestions.length : 'not an array',
              suggestionsValue: suggestions,
            });

            // Validate we have type and content
            if (type && content !== undefined && content !== null) {
              // Parse suggestions array - ensure it's an array and extract each item
              let parsedSuggestions: string[] | undefined = undefined;

              if (suggestions !== undefined && suggestions !== null) {
                if (Array.isArray(suggestions)) {
                  // Filter out any null/undefined values and ensure all items are strings
                  parsedSuggestions = suggestions
                    .filter((s: unknown) => s !== null && s !== undefined)
                    .map((s: unknown) => String(s));

                  console.log('[Chat Stream] Step 5 - Parsed suggestions array:', {
                    originalLength: suggestions.length,
                    parsedLength: parsedSuggestions.length,
                    items: parsedSuggestions,
                  });
                } else {
                  console.warn('[Chat Stream] Step 5 - Suggestions is not an array:', typeof suggestions);
                }
              } else {
                console.log('[Chat Stream] Step 5 - No suggestions found in response');
              }

              responseData = {
                type: String(type),
                content: String(content),
                suggestions: parsedSuggestions && parsedSuggestions.length > 0 ? parsedSuggestions : undefined
              };

              console.log('[Chat Stream] SUCCESS: Response data parsed successfully', {
                type: responseData.type,
                contentLength: responseData.content ? responseData.content.length : 0,
                hasSuggestions: !!responseData.suggestions,
                suggestionsCount: responseData.suggestions ? responseData.suggestions.length : 0,
              });
            } else {
              console.error('[Chat Stream] ERROR: Missing required fields | requestId:', requestId, '| hasType:', !!type, '| typeValue:', type, '| hasContent:', content !== undefined && content !== null);
            }
          } else {
            console.error('[Chat Stream] ERROR: Parsed response is not an object | requestId:', requestId, '| type:', typeof parsedResponse);
          }
        } catch (parseError) {
          console.error('[Chat Stream] ERROR: Failed to parse response JSON string | requestId:', requestId, '| error:', parseError instanceof Error ? parseError.message : String(parseError));
        }
      }
    }

    // Step 6: Extract content and suggestions for streaming
    let contentToStream: string;
    let suggestionsArray: string[] = [];

    if (responseData && responseData.type && responseData.content !== undefined && responseData.content !== null) {
      console.log('[Chat Stream] Step 6 - Processing response. Type:', responseData.type, 'Content length:', String(responseData.content).length);

      // Extract only the content for streaming (not the whole JSON)
      contentToStream = String(responseData.content);

      // Step 7: Parse suggestions array - check length and extract items
      if (responseData.suggestions && Array.isArray(responseData.suggestions) && responseData.suggestions.length > 0) {
        console.log('[Chat Stream] Step 7 - Parsing suggestions array');
        console.log('[Chat Stream] Step 7 - Suggestions array length:', responseData.suggestions.length);
        console.log('[Chat Stream] Step 7 - Suggestions array items:', responseData.suggestions);
        console.log('[Chat Stream] Step 7 - Suggestions indices:', responseData.suggestions.map((_, index) => index));

        // Map each suggestion to ensure they're strings
        suggestionsArray = responseData.suggestions.map((suggestion: string, index: number) => {
          console.log(`[Chat Stream] Step 7 - Mapping suggestion [${index}]:`, suggestion);
          return String(suggestion);
        });

        console.log('[Chat Stream] Step 7 - SUCCESS: Suggestions array parsed, total cards:', suggestionsArray.length);
      } else {
        const suggestionsLength = responseData.suggestions ? (Array.isArray(responseData.suggestions) ? responseData.suggestions.length : 'not an array') : 'missing';
        console.log('[Chat Stream] Step 7 - No suggestions to add. Suggestions array:', suggestionsLength);
      }

      console.log('[Chat Stream] Step 6 - SUCCESS: Content and suggestions extracted');
    } else {
      console.error('[Chat Stream] Step 6 - ERROR: Invalid responseData | requestId:', requestId, '| responseData:', responseData ? 'present' : 'null');
      contentToStream = 'Error: Unable to parse response from AI service.';
    }

    // When we created a new session (temp id), tell client to rename to our UUID so URL becomes /chat/<uuid>
    if (conversationId && sessionIdToSend && conversationId !== sessionIdToSend) {
      try {
        await updateConversationSessionId(conversationId, sessionIdToSend);
      } catch (error) {
        console.error('[Chat Stream] Error updating conversation sessionId:', error);
      }
    }

    // Insert model event and update session AFTER we have the response (before creating stream)
    if (ourSessionId && dbConfigured) {
      try {
        // On regenerate/rename: replace old assistant response and update user message if renamed
        if (isRetry) {
          await updateLastUserEventContent(ourSessionId, userId, message);
          const deleted = await deleteLastAssistantEvent(ourSessionId, userId);
          if (deleted) {
            console.log('[Chat Stream] Deleted previous assistant event for regenerate/rename');
          }
        }

        console.log('[Chat Stream] Inserting model event...', { 
          ourSessionId, 
          userId, 
          hasRawModelResponse: !!rawModelResponseString,
          rawModelResponseLength: rawModelResponseString?.length || 0,
          contentToStreamLength: contentToStream?.length || 0 
        });
        
        const modelContent =
          rawModelResponseString && suggestionsArray.length > 0
            ? buildModelEventStorageText(rawModelResponseString, suggestionsArray)
            : rawModelResponseString || contentToStream;
        if (modelContent) {
          const responseIsPro = apiData.output?.is_pro === true;
          modelEventIdForClient = await insertEvent(ourSessionId, userId, 'root_agent', modelContent, DEFAULT_APP_NAME, responseIsPro);
          if (modelEventIdForClient) {
            console.log('[Chat Stream] Model event inserted successfully:', modelEventIdForClient);
          } else {
            console.error('[Chat Stream] Failed to insert model event - insertEvent returned null. Check database connection and event table.');
          }
        } else {
          console.warn('[Chat Stream] No model content to insert - rawModelResponseString and contentToStream are both empty');
        }
        
        // Update title from first message if not set by client
        if (!titleFromClient || typeof titleFromClient !== 'string' || !titleFromClient.trim()) {
          const { ensureSessionTitleFromFirstMessage } = await import('@/lib/db/sessions');
          await ensureSessionTitleFromFirstMessage(ourSessionId, userId, message);
          console.log('[Chat Stream] Session title set from first message');
        }
        
        // Update session timestamp
        const { updateSessionTimestamp } = await import('@/lib/db/sessions');
        await updateSessionTimestamp(ourSessionId);
        console.log('[Chat Stream] Session timestamp updated:', ourSessionId);
      } catch (err) {
        console.error('[Chat Stream] Error inserting model event or updating session:', err);
        console.error('[Chat Stream] Error details:', err instanceof Error ? err.message : String(err));
        console.error('[Chat Stream] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
        // Continue anyway - don't block the stream response
      }
    } else {
      console.warn('[Chat Stream] Skipping model event insertion:', { ourSessionId, dbConfigured });
    }

          console.log('[Chat Stream] Starting stream – requestId:', requestId, '| totalElapsedMs:', Date.now() - startTime);

          // First event: session_id and is_pro (from API response) so client adopts URL and knows if response is Pro mode
          const responseIsPro = apiData.output?.is_pro === true;
          const firstEvent = sessionIdToSend
            ? { sessionId: sessionIdToSend, is_pro: responseIsPro, ...(modelEventIdForClient ? { eventId: modelEventIdForClient } : {}) }
            : { is_pro: responseIsPro, ...(modelEventIdForClient ? { eventId: modelEventIdForClient } : {}) };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(firstEvent)}\n\n`));

          // Stream content in small chunks for auto-typing animation (works for paragraphs, tables, charts, etc.)
          const CHUNK_SIZE = 25; // Characters per chunk for smooth typing effect
          for (let i = 0; i < contentToStream.length; i += CHUNK_SIZE) {
            const chunk = contentToStream.slice(i, i + CHUNK_SIZE);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 25));
          }

          // Step 8: Stream suggestions HTML as suggestion cards (only if array has items - length > 0)
          if (suggestionsArray.length > 0) {
            const escapeHtml = (text: string) =>
              text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
            const suggestionsHtml = suggestionsArray
              .map((s: string) => `<button data-type="suggestion">${escapeHtml(s)}</button>`)
              .join('\n');
            const suggestionsBlock = `\n\nTo go further:\n\n<div data-type="suggestions">\n${suggestionsHtml}\n</div>`;
            for (let i = 0; i < suggestionsBlock.length; i += CHUNK_SIZE) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: suggestionsBlock.slice(i, i + CHUNK_SIZE) })}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 25));
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) {
          clearInterval(keepAliveId);
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[Chat Stream] Stream error – requestId:', requestId, '| error:', msg);
          sendError(msg, 500);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx/proxy buffering for real-time streaming
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error('[Chat Stream] Streaming API error – requestId:', requestId, '| error:', errMsg, '| stack:', errStack);
    return new Response(
      JSON.stringify({
        error: 'An error occurred while streaming.',
        message: errMsg,
      }),
      { status: 500 }
    );
  }
}

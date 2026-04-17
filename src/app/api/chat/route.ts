import { NextRequest, NextResponse } from 'next/server';
import type { ChatRequest, ChatResponse } from '@/types';
import { getSessionFromRequest } from '@/lib/auth/session';
import { updateConversationSessionId } from '@/lib/utils/conversation';
import { getGcpAccessToken, clearTokenCache } from '@/lib/gcp/auth';
import { getChatApiSessionId, setChatApiSessionId, createSession } from '@/lib/db/sessions';
import { isUUID } from '@/lib/utils/id';

/** Allow up to 120s for Chat API (can take 90–100s). */
export const maxDuration = 120;

// Google Cloud AI Platform API configuration
const GOOGLE_CLOUD_API_URL = process.env.GOOGLE_CLOUD_API_URL ||
  'https://europe-west1-aiplatform.googleapis.com/v1/projects/prj-ai-dev-qic/locations/europe-west1/reasoningEngines/3614077128313667584:query';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationId, is_pro: isPro } = body;

    // Get user session to extract user ID
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.userId || session.email || 'unknown-user';

    // UUID everywhere: client and DB use only UUID; Chat API session id lives in sessions.state.chatApiSessionId.
    const { isDbConfigured } = await import('@/lib/db');
    const isTempId =
      !conversationId ||
      conversationId.startsWith('conv-') ||
      conversationId.startsWith('new-');
    let ourSessionId: string;
    if (isTempId && isDbConfigured()) {
      const newSession = await createSession(userId);
      ourSessionId = newSession?.id ?? crypto.randomUUID();
    } else {
      ourSessionId = conversationId!;
    }
    const sessionIdForApi = (await getChatApiSessionId(ourSessionId, userId)) ?? '';

    // Get GCP access token for Chat API authentication
    // Note: Chat API requires GCP token, not Azure token
    let gcpToken: string;
    try {
      gcpToken = await getGcpAccessToken();
    } catch (error) {
      console.error('Failed to get GCP access token:', error);
      return NextResponse.json(
        { error: 'Failed to authenticate with GCP service' },
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

    console.log('[Chat API] Calling Google Cloud API:', {
      url: GOOGLE_CLOUD_API_URL,
      userId,
      hasSessionId: !!sessionIdForApi,
      messageLength: message.length,
    });

    // Call Google Cloud AI Platform API with automatic token refresh on 401
    let apiResponse = await fetch(GOOGLE_CLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gcpToken}`, // Use GCP access token for Chat API
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Chat API] API Response status:', apiResponse.status);

    // If we get a 401, the token might be expired - try refreshing and retrying once
    if (apiResponse.status === 401) {
      console.warn('[Chat API] Received 401, refreshing GCP token and retrying...');
      try {
        // Force refresh the token
        clearTokenCache();
        gcpToken = await getGcpAccessToken(true); // Force refresh

        // Retry the request with the new token
        apiResponse = await fetch(GOOGLE_CLOUD_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gcpToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('[Chat API] Retry response status:', apiResponse.status);
      } catch (refreshError) {
        console.error('[Chat API] Failed to refresh token:', refreshError);
        return NextResponse.json(
          {
            error: 'Authentication failed',
            message: 'Failed to refresh GCP access token',
          },
          { status: 401 }
        );
      }
    }

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Google Cloud API error:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: 'Failed to get response from AI service',
          message: `API error: ${apiResponse.status} ${apiResponse.statusText}`,
        },
        { status: apiResponse.status || 500 }
      );
    }

    // Step 1: Get raw text first, then parse. session_id can be a large number (>2^53) — JSON.parse
    // would corrupt it. Extract from raw text to preserve exact digits.
    const rawText = await apiResponse.text();
    const apiData = JSON.parse(rawText) as { output?: { session_id?: unknown; sessionId?: unknown; sessionid?: unknown; response?: string; suggestions?: string[] } };
    console.log('[Chat API] Step 1 - Main API Response:', JSON.stringify(apiData, null, 2));

    // Step 2: Extract session_id from raw text to avoid JS number precision loss (session_id > 2^53)
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
    const sessionIdForClient = isUUID(ourSessionId) ? ourSessionId : undefined;
    console.log('[Chat API] Step 2 - API session_id stored in state; client sessionId (UUID):', sessionIdForClient ?? ourSessionId);

    // Step 3: Parse the "response" key from output (it's a JSON string)
    let responseData: { type?: string; content?: string; suggestions?: string[] } | null = null;

    if (!apiData.output) {
      console.error('[Chat API] ERROR: No output found in API response');
    } else if (!apiData.output.response) {
      console.error('[Chat API] ERROR: No response key found in output. Available keys:', Object.keys(apiData.output));
    } else {
      const responseString = apiData.output.response;
      console.log('[Chat API] Step 3 - Response string type:', typeof responseString);
      console.log('[Chat API] Step 3 - Response string value:', responseString);

      if (typeof responseString !== 'string') {
        console.error('[Chat API] ERROR: output.response is not a string, it is:', typeof responseString);
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
            console.log('[Chat API] Step 4 - Detected markdown code block format');
            // Remove markdown code block markers (```json ... ```)
            // Handle both ```json and ``` markers
            cleanedString = cleanedString.replace(/^```json\s*/i, ''); // Remove opening ```json
            cleanedString = cleanedString.replace(/^```\s*/i, ''); // Remove opening ``` if no json
            cleanedString = cleanedString.replace(/\s*```$/i, ''); // Remove closing ```
            cleanedString = cleanedString.trim();
          } else {
            console.log('[Chat API] Step 4 - Detected plain JSON string format (with escaped newlines)');
            // Plain JSON string - JSON.parse will handle escaped newlines automatically
          }

          console.log('[Chat API] Step 4 - Cleaned string (first 200 chars):', cleanedString.substring(0, 200));

          // Parse the JSON string (JSON.parse handles escaped newlines \n automatically)
          const parsedResponse = JSON.parse(cleanedString);
          console.log('[Chat API] Step 4 - Parsed response:', JSON.stringify(parsedResponse, null, 2));

          // Step 5: Extract content and suggestions
          if (parsedResponse && typeof parsedResponse === 'object') {
            const type = parsedResponse.type;
            let content = parsedResponse.content;
            let suggestions = parsedResponse.suggestions;

            // Handle batch2 format: { type: "batch2", blocks: [...] } — no content field
            // UI expects: <div data-type="batch2-response">${JSON.stringify({ type, blocks })}</div>
            if (type === 'batch2' && parsedResponse.blocks && Array.isArray(parsedResponse.blocks) && (content === undefined || content === null)) {
              content = `<div data-type="batch2-response">${JSON.stringify({ type: 'batch2', blocks: parsedResponse.blocks })}</div>`;
              console.log('[Chat API] Step 5 - Constructed batch2 content from blocks');
            }
            // Handle content field that is batch2 JSON string (e.g. API returns nested structure)
            else if (typeof content === 'string' && content.trim()) {
              try {
                const contentParsed = JSON.parse(content.trim());
                if (contentParsed?.type === 'batch2' && Array.isArray(contentParsed?.blocks)) {
                  content = `<div data-type="batch2-response">${JSON.stringify({ type: 'batch2', blocks: contentParsed.blocks })}</div>`;
                  console.log('[Chat API] Step 5 - Wrapped batch2 JSON from content field');
                }
              } catch {
                // content is not batch2 JSON, use as-is
              }
            }

            // Use top-level output.suggestions when not present in parsed response
            if ((suggestions === undefined || suggestions === null || !Array.isArray(suggestions)) && apiData.output?.suggestions && Array.isArray(apiData.output.suggestions)) {
              suggestions = apiData.output.suggestions;
              console.log('[Chat API] Step 5 - Using suggestions from output.suggestions');
            }

            console.log('[Chat API] Step 5 - Extracted values:', {
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

                  console.log('[Chat API] Step 5 - Parsed suggestions array:', {
                    originalLength: suggestions.length,
                    parsedLength: parsedSuggestions.length,
                    items: parsedSuggestions,
                  });
                } else {
                  console.warn('[Chat API] Step 5 - Suggestions is not an array:', typeof suggestions);
                }
              } else {
                console.log('[Chat API] Step 5 - No suggestions found in response');
              }

              responseData = {
                type: String(type),
                content: String(content),
                suggestions: parsedSuggestions && parsedSuggestions.length > 0 ? parsedSuggestions : undefined
              };

              console.log('[Chat API] SUCCESS: Response data parsed successfully', {
                type: responseData.type,
                contentLength: String(responseData.content).length,
                hasSuggestions: !!responseData.suggestions,
                suggestionsCount: responseData.suggestions ? responseData.suggestions.length : 0,
              });
            } else {
              console.error('[Chat API] ERROR: Missing required fields:', {
                hasType: !!type,
                typeValue: type,
                hasContent: content !== undefined && content !== null,
                contentValue: content,
              });
            }
          } else {
            console.error('[Chat API] ERROR: Parsed response is not an object:', typeof parsedResponse);
          }
        } catch (parseError) {
          console.error('[Chat API] ERROR: Failed to parse response JSON string:', parseError);
          console.error('[Chat API] Parse error message:', parseError instanceof Error ? parseError.message : String(parseError));
        }
      }
    }

    // Step 6: Process the response and format for display
    let responseMessage: string;

    if (responseData && responseData.type && responseData.content !== undefined && responseData.content !== null) {
      console.log('[Chat API] Step 6 - Processing response. Type:', responseData.type, 'Content length:', String(responseData.content).length);

      // Extract only the content (not the whole JSON)
      let formattedResponse = String(responseData.content);

      // Step 7: Parse and add suggestions ONLY if suggestions array has items (length > 0)
      if (responseData.suggestions && Array.isArray(responseData.suggestions) && responseData.suggestions.length > 0) {
        console.log('[Chat API] Step 7 - Parsing suggestions array');
        console.log('[Chat API] Step 7 - Suggestions array length:', responseData.suggestions.length);
        console.log('[Chat API] Step 7 - Suggestions array items:', responseData.suggestions);
        console.log('[Chat API] Step 7 - Suggestions indices:', responseData.suggestions.map((_, index) => index));

        // Escape HTML entities in suggestion text to prevent XSS
        const escapeHtml = (text: string) => {
          return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };

        // Map each suggestion to a suggestion card button
        // For array length 2: indices [0, 1] -> 2 cards
        // For array length 3: indices [0, 1, 2] -> 3 cards
        const suggestionsHtml = responseData.suggestions
          .map((suggestion: string, index: number) => {
            const escapedSuggestion = escapeHtml(String(suggestion));
            console.log(`[Chat API] Step 7 - Mapping suggestion [${index}]:`, suggestion);
            return `<button data-type="suggestion">${escapedSuggestion}</button>`;
          })
          .join('\n');

        // Append suggestions intro + HTML block (default when suggestions exist)
        formattedResponse += `\n\nTo go further:\n\n<div data-type="suggestions">\n${suggestionsHtml}\n</div>`;
        console.log('[Chat API] Step 7 - SUCCESS: Suggestions HTML added, total cards:', responseData.suggestions.length);
      } else {
        const suggestionsLength = responseData.suggestions ? (Array.isArray(responseData.suggestions) ? responseData.suggestions.length : 'not an array') : 'missing';
        console.log('[Chat API] Step 7 - No suggestions to add. Suggestions array:', suggestionsLength);
      }

      responseMessage = formattedResponse;
      console.log('[Chat API] Step 6 - SUCCESS: Response message formatted');
    } else {
      console.error('[Chat API] Step 6 - ERROR: Invalid responseData:', responseData);
      responseMessage = 'Error: Unable to parse response from AI service.';
    }

    console.log('[Chat API] Final responseMessage length:', responseMessage.length, 'First 100 chars:', responseMessage.substring(0, 100));

    if (conversationId && sessionIdForClient) {
      try {
        console.log('[Chat API] Updating conversation sessionId:', { conversationId, sessionIdForClient });
        await updateConversationSessionId(conversationId, sessionIdForClient);
        console.log('[Chat API] Successfully updated conversation sessionId');
      } catch (error) {
        console.error('[Chat API] Error updating conversation sessionId:', error);
      }
    } else {
      console.log('[Chat API] Skipping sessionId update:', { conversationId, sessionIdForClient });
    }

    const response: ChatResponse = {
      message: responseMessage,
      conversationId: conversationId,
      ...(sessionIdForClient && { sessionId: sessionIdForClient }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while processing your request.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


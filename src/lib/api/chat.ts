import type { ChatRequest, ChatResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/** Client timeout: Chat API can take up to 90–100s; allow 120s before aborting. */
const CHAT_STREAM_TIMEOUT_MS = 120_000;

export const chatApi = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
    } catch {
      // Handle network errors during fetch
      const networkError = new Error('Network connection error. Please check your internet connection and try again.') as Error & { status?: number };
      networkError.status = 0; // 0 indicates network error
      throw networkError;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Failed to send message',
      }));

      // Create error with status code for better error handling
      const errorMessage = error.message || error.error || 'Failed to send message';
      const enhancedError = new Error(errorMessage) as Error & { status?: number };
      enhancedError.status = response.status;
      throw enhancedError;
    }

    return response.json();
  },

  streamMessage: async function* (
    request: ChatRequest
  ): AsyncGenerator<string | { sessionId?: string; is_pro?: boolean }, void, unknown> {
    let response: Response;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_STREAM_TIMEOUT_MS);
    try {
      response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? 'Request timed out. The Chat API may be slow. Please try again.'
        : 'Network connection error. Please check your internet connection and try again.';
      const networkError = new Error(msg) as Error & { status?: number };
      networkError.status = 0;
      throw networkError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Failed to stream message',
      }));

      // Create error with status code for better error handling
      const errorMessage = error.message || error.error || 'Failed to stream message';
      // Log for debugging: server can succeed but proxy/LB may return 504 before first byte (long API latency)
      console.error('[chatApi.streamMessage] Non-OK response:', response.status, response.statusText, '| message:', errorMessage);
      const enhancedError = new Error(errorMessage) as Error & { status?: number };
      enhancedError.status = response.status;
      throw enhancedError;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                const err = new Error(parsed.error) as Error & { status?: number };
                err.status = parsed.status;
                throw err;
              }
              const sid = parsed.sessionId ?? parsed.session_id;
              const isPro = parsed.is_pro === true;
              // Yield metadata object (sessionId and/or is_pro from API response)
              if ((sid != null && sid !== '') || parsed.is_pro !== undefined) {
                const meta: { sessionId?: string; is_pro?: boolean } = {};
                if (sid != null && sid !== '') meta.sessionId = String(sid);
                if (parsed.is_pro !== undefined) meta.is_pro = isPro;
                yield meta;
              }
              // Preserve string content as-is (text, markdown, tables, charts). Coerce only non-string to avoid crashes.
              const raw = parsed.content ?? parsed.text ?? '';
              const content = typeof raw === 'string' ? raw : (raw != null ? String(raw) : '');
              if (content) {
                yield content;
              }
            } catch (e) {
              if (e instanceof SyntaxError) { /* Skip invalid JSON line */ }
              else throw e; // Rethrow API error or other errors
            }
          }
        }
      }
      // Process any remaining line in buffer
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const sid = parsed.sessionId ?? parsed.session_id;
            if (sid != null && sid !== '') {
              yield { sessionId: String(sid) };
            }
          } catch {
            // Skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};


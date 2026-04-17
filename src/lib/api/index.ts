import type { Conversation, Message, PinnedItem, ChatRequest } from '@/types';
export { authApi } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

type StreamMeta = { sessionId?: string; is_pro?: boolean; eventId?: string };

function parseStreamPayload(
  data: string
): { meta?: StreamMeta; content?: string } | null {
  if (!data || data === '[DONE]') return null;

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const sid = parsed.sessionId ?? parsed.session_id;
    const eventId = parsed.eventId ?? parsed.event_id;
    const isPro = parsed.is_pro === true;

    let meta: StreamMeta | undefined;
    if ((sid != null && sid !== '') || parsed.is_pro !== undefined || (eventId != null && eventId !== '')) {
      meta = {};
      if (sid != null && sid !== '') meta.sessionId = String(sid);
      if (parsed.is_pro !== undefined) meta.is_pro = isPro;
      if (eventId != null && eventId !== '') meta.eventId = String(eventId);
    }

    const content = String(parsed.content || parsed.text || '');
    return { meta, content: content || undefined };
  } catch {
    // Skip invalid JSON
    return null;
  }
}

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  // Check if response is OK - only log errors for actual failures
  if (!response.ok) {
    const status = response.status;
    const url = response.url || '';
    let errorMessage = `HTTP error! status: ${status}`;

    // Try to get error message from response
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch {
      // If JSON parsing fails, use status-based messages
      switch (status) {
        case 404:
          errorMessage = 'API endpoint not found. Please check if the server is running and the endpoint is correct.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 503:
          errorMessage = 'Service unavailable. Please try again later.';
          break;
        default:
          errorMessage = `HTTP error! status: ${status}`;
      }
    }

    // Suppress console errors for 404 on DELETE operations for pinned items
    // (item may already be deleted, which is effectively success)
    // Also suppress 404 for reorder endpoint (may not be implemented yet or MSW not set up)
    const isPinnedDelete404 = status === 404 && url.includes('/api/pinned/') && !url.includes('/reorder');
    const isPinnedReorder404 = status === 404 && url.includes('/api/pinned/reorder');

    if (!isPinnedDelete404 && !isPinnedReorder404) {
      // Log error details - use individual console.error calls to ensure values are captured
      console.error('API Error - Status:', status);
      console.error('API Error - StatusText:', response.statusText || 'N/A');
      console.error('API Error - URL:', url || 'N/A');
      console.error('API Error - Message:', errorMessage);
    }

    throw new Error(errorMessage);
  }

  // Handle successful responses
  // Check if response has content before parsing JSON
  const contentType = response.headers.get('content-type');
  const text = await response.text();

  // Handle empty responses (e.g., 204 No Content or empty body)
  if (!text || text.trim() === '') {
    // For successful responses with no body, return a default success object
    return { success: true } as T;
  }

  // Try to parse JSON
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    // If JSON parsing fails on a successful response, log warning and return default
    // This should not happen in normal operation, but handle gracefully
    if (contentType?.includes('application/json')) {
      console.warn('Failed to parse JSON response:', {
        url: response.url ?? 'unknown',
        status: response.status,
        contentType,
      });
    }
    // Return default success object for non-JSON responses that are successful
    return { success: true } as T;
  }
}

// User Profile API
export const userApi = {
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      credentials: 'include', // Ensure cookies are sent
    });

    // Handle 401 gracefully - user is not authenticated, return null instead of throwing
    if (response.status === 401) {
      return null;
    }

    return handleResponse<{
      id: string;
      name: string; // First name (for backward compatibility)
      firstName?: string; // First name only
      fullName?: string; // Full name (first + last)
      email: string;
      avatar: string | null;
    } | null>(response);
  },
};

// Welcome Screen API
export const welcomeApi = {
  getPrompts: async () => {
    const response = await fetch(`${API_BASE_URL}/welcome/prompts`);
    return handleResponse<{
      greeting: string;
      subtitle: string;
      prompts: Array<{ id: string; text: string }>;
    }>(response);
  },
};

// Conversations API
export const conversationsApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/conversations`);
    return handleResponse<{
      conversations: Array<Omit<Conversation, 'createdAt' | 'updatedAt' | 'messages'> & {
        createdAt: string;
        updatedAt: string;
        messages: Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
      }>;
      groups: Array<{
        id: string;
        name: string;
        conversationIds: string[];
      }>;
    }>(response);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`);
    return handleResponse<Omit<Conversation, 'createdAt' | 'updatedAt' | 'messages'> & {
      createdAt: string;
      updatedAt: string;
      messages: Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
    }>(response);
  },

  create: async (title?: string) => {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return handleResponse<Omit<Conversation, 'createdAt' | 'updatedAt' | 'messages'> & {
      createdAt: string;
      updatedAt: string;
      messages: Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
    }>(response);
  },

  update: async (id: string, updates: { title?: string; starred?: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<Omit<Conversation, 'createdAt' | 'updatedAt' | 'messages'> & {
      createdAt: string;
      updatedAt: string;
      messages: Array<Omit<Message, 'timestamp'> & { timestamp: string }>;
    }>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(response);
  },
};

// Groups API
export const groupsApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/groups`);
    return handleResponse<Array<{
      id: string;
      name: string;
      conversationIds: string[];
      starred?: boolean;
      archived?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }>>(response);
  },

  create: async (name: string) => {
    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse<{
      id: string;
      name: string;
      conversationIds: string[];
      starred?: boolean;
      archived?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }>(response);
  },

  addConversations: async (groupId: string, conversationIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationIds }),
    });
    return handleResponse<{
      id: string;
      name: string;
      conversationIds: string[];
    }>(response);
  },

  removeConversations: async (groupId: string, conversationIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/conversations`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationIds }),
    });
    return handleResponse<{ success: boolean }>(response);
  },

  update: async (groupId: string, updates: { name?: string; starred?: boolean; archived?: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<{
      id: string;
      name: string;
      conversationIds: string[];
      starred?: boolean;
      archived?: boolean;
      createdAt?: string;
      updatedAt?: string;
    }>(response);
  },

  delete: async (groupId: string) => {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(response);
  },
};

// Chat API
export const chatApi = {
  sendMessage: async (
    request: ChatRequest
  ): Promise<{ conversationId: string; message: Record<string, unknown> }> => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include', // Ensure cookies are sent for authentication
    });
    return handleResponse(response);
  },

  streamMessage: async function* (
    request: ChatRequest
  ): AsyncGenerator<string | { sessionId?: string; is_pro?: boolean }, void, unknown> {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include', // Ensure cookies are sent for authentication
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Failed to stream message',
      }));
      const err = new Error(error.message || error.error || 'Failed to stream message') as Error & { status?: number };
      err.status = response.status;
      throw err;
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
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              return;
            }
            const parsed = parseStreamPayload(data);
            if (!parsed) continue;
            if (parsed.meta) yield parsed.meta;
            if (parsed.content) yield parsed.content;
          }
        }
      }
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        if (data !== '[DONE]') {
          const parsed = parseStreamPayload(data);
          if (parsed?.meta) yield parsed.meta;
          if (parsed?.content) yield parsed.content;
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};

// Pinned Items API
export const pinnedApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/pinned`);
    return handleResponse<{
      items: Array<Omit<PinnedItem, 'pinnedAt'> & { pinnedAt: string }>;
    }>(response);
  },

  create: async (item: Omit<PinnedItem, 'pinnedAt'>) => {
    const response = await fetch(`${API_BASE_URL}/pinned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return handleResponse<Omit<PinnedItem, 'pinnedAt'> & { pinnedAt: string }>(response);
  },

  update: async (id: string, updates: { title?: string; note?: string }) => {
    const response = await fetch(`${API_BASE_URL}/pinned/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<Omit<PinnedItem, 'pinnedAt'> & { pinnedAt: string }>(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/pinned/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(response);
  },

  reorder: async (activeId: string, overId: string) => {
    const response = await fetch(`${API_BASE_URL}/pinned/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeId, overId }),
    });
    return handleResponse<{ success: boolean }>(response);
  },
};

// Reactions API (flag/dislike per assistant response)
export const reactionsApi = {
  toggle: async (params: { eventId: string; action: 'flag' | 'dislike' }) => {
    const response = await fetch(`${API_BASE_URL}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      credentials: 'include',
    });
    return handleResponse<{ isFlagged: boolean; isDisliked: boolean }>(response);
  },
};

// Dataset API
export const datasetApi = {
  getDatasets: async () => {
    const response = await fetch(`${API_BASE_URL}/datasets`);
    return handleResponse<{
      datasets: Array<{ id: string; name: string }>;
    }>(response);
  },

  getTables: async (datasetId: string) => {
    const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/tables`);
    return handleResponse<{
      tables: Array<{ id: string; name: string }>;
    }>(response);
  },

  getTableColumns: async (datasetId: string, tableId: string) => {
    const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/tables/${tableId}/columns`);
    return handleResponse<{
      columns: Array<{ name: string; type: string }>;
    }>(response);
  },
};

// Consent API
export const consentApi = {
  get: async () => {
    const response = await fetch(`${API_BASE_URL}/consent`, {
      credentials: 'include',
    });
    if (response.status === 401) {
      return null;
    }
    return handleResponse<{
      consent: 'accept' | 'decline' | null;
      needsConsent: boolean;
      createdAt?: string;
      updatedAt?: string;
    } | null>(response);
  },

  accept: async () => {
    const response = await fetch(`${API_BASE_URL}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'accept' }),
    });
    return handleResponse<{ success: boolean; consent: string }>(response);
  },

  decline: async () => {
    const response = await fetch(`${API_BASE_URL}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'decline' }),
    });
    return handleResponse<{ success: boolean; consent: string }>(response);
  },

  withdraw: async () => {
    const response = await fetch(`${API_BASE_URL}/consent/withdraw`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ success: boolean; message: string }>(response);
  },
};

// Alerts API
export const alertsApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/alerts`);
    return handleResponse<{
      alerts: Array<{
        id: string;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'error' | 'success';
        timestamp: string;
        read: boolean;
      }>;
    }>(response);
  },

  markRead: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/alerts/${id}/read`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean }>(response);
  },
};


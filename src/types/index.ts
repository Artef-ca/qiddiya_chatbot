// File attachment types
export interface FileAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // in bytes
  file: File | null; // File object for uploads
  url?: string; // URL for uploaded files
  icon?: string; // Icon type for display
}

// Pinned item types
export interface PinnedItem {
  id: string;
  messageId: string;
  conversationId: string;
  content: string;
  title?: string;
  note?: string;
  pinnedAt: Date;
  type: 'message' | 'response';
}

// Chat message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  errorType?: 'unauthorized' | 'network' | 'general'; // Error type for better error display
  /** API response status (200/201 = success; treat content normally even if it mentions "error") */
  apiStatus?: number;
  attachments?: FileAttachment[]; // File attachments for user messages
  pinnedItems?: PinnedItem[]; // Pinned items for user messages
  /** Pro mode: when true, response was generated with Pro toggle on. Shown with distinct styling. */
  is_pro?: boolean;
  /** Per-user feedback toggles for assistant responses. */
  isFlagged?: boolean;
  isDisliked?: boolean;
  /**
   * DB event id (uuid) for this assistant response.
   * Populated during streaming so the client can persist feedback immediately.
   */
  eventId?: string;
}

// Chat conversation types
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  starred?: boolean;
  archived?: boolean;
  sessionId?: string; // Google Cloud AI Platform session ID for continuing conversations
}

// API response types
export interface ChatResponse {
  message: string;
  conversationId?: string;
  sessionId?: string; // Google Cloud AI Platform session ID
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  history?: Message[];
  /** Title from client (first user query); stored in session state. */
  title?: string;
  /** Pro mode: when true, enables enhanced/advanced responses. Default false. */
  is_pro?: boolean;
  /** When true, skip inserting user event (retry/regenerate - user message already exists). */
  isRetry?: boolean;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}


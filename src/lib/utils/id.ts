/**
 * ID generation utilities
 */

/** UUID v4 regex (8-4-4-4-12 hex, version 4) */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true if the string is a valid UUID (so we never send Chat API numeric session id to client/URL).
 */
export function isUUID(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.length > 0 && UUID_REGEX.test(s);
}

const ID_PREFIXES = {
  conversation: 'conv',
  message: 'msg',
} as const;

/**
 * Generates a unique conversation ID
 */
export function generateConversationId(): string {
  return `${ID_PREFIXES.conversation}-${Date.now()}`;
}

/**
 * Generates a unique message ID
 */
export function generateMessageId(role: 'user' | 'assistant' | 'system' = 'user'): string {
  return `${ID_PREFIXES.message}-${Date.now()}-${role}`;
}

/**
 * Generates a unique ID with a custom prefix
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}


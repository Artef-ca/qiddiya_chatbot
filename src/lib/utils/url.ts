/**
 * URL helpers for chat. Client and DB use only UUID; URL is /chat/<uuid>.
 */

/** For chat URL: use id as-is (session id only). Never add conv- prefix. */
export function formatConversationIdForUrl(conversationId: string): string {
  if (!conversationId) return '';
  return conversationId;
}

export function parseConversationIdFromUrl(urlId: string | null | undefined): string | null {
  if (!urlId) return null;
  return urlId;
}

export function buildChatUrl(conversationId?: string | null): string {
  return conversationId ? `/chat/${conversationId}` : '/chat';
}

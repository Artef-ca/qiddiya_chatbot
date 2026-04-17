/**
 * Controls mock vs real API for: conversations, groups, pinned.
 * - In production: always false → never mock; only real API (and only dataset is mocked in prod).
 * - In dev: true only when NEXT_PUBLIC_USE_MOCK_API=true; if unset, false (real API).
 */
const rawMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API ?? '';
export const useMockApiForConversationsPinnedGroups =
  process.env.NODE_ENV !== 'production' && rawMockApi.toLowerCase() === 'true';

/** @deprecated Use useMockApiForConversationsPinnedGroups */
export const useMockApiForPinnedGroup = useMockApiForConversationsPinnedGroups;

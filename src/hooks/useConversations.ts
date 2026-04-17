import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  loadMockData,
  upsertConversation,
  deleteConversation as deleteConvAction,
  updateConversationTitle,
} from '@/store/slices/chatSlice';
import { conversationsApi } from '@/lib/api';
import { deserializeDate, serializeDate } from '@/lib/utils/date';
import type { Conversation } from '@/types';

type ApiMessageLike = Record<string, unknown> & { timestamp?: unknown };
type ApiConversationLike = Record<string, unknown> & {
  createdAt?: unknown;
  updatedAt?: unknown;
  messages?: ApiMessageLike[];
};

function asDateInput(value: unknown): string | Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return value;
  return String(value ?? '');
}

// Helper to deserialize API response to Conversation
const deserializeConversation = (conv: ApiConversationLike): Conversation => ({
  ...conv,
  createdAt: deserializeDate(asDateInput(conv.createdAt)),
  updatedAt: deserializeDate(asDateInput(conv.updatedAt)),
  messages: (conv.messages || []).map((msg) => ({
    ...msg,
    timestamp: deserializeDate(asDateInput(msg.timestamp)),
  })),
}) as Conversation;

// Helper to serialize Conversation for Redux (dates as strings)
const serializeConversationForRedux = (conv: Conversation) => {
  // Ensure all dates are properly serialized
  const serialized = {
    ...conv,
    createdAt: conv.createdAt instanceof Date
      ? serializeDate(conv.createdAt)
      : typeof conv.createdAt === 'string'
        ? conv.createdAt
        : new Date(conv.createdAt).toISOString(),
    updatedAt: conv.updatedAt instanceof Date
      ? serializeDate(conv.updatedAt)
      : typeof conv.updatedAt === 'string'
        ? conv.updatedAt
        : new Date(conv.updatedAt).toISOString(),
    messages: conv.messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date
        ? serializeDate(msg.timestamp)
        : typeof msg.timestamp === 'string'
          ? msg.timestamp
          : new Date(msg.timestamp).toISOString(),
    })),
  };
  return serialized;
};

export function useConversations() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { conversations: reduxConversations } = useAppSelector((state) => state.chat);

  // Check Redux first - if conversation with messages exists, return immediately (ChatGPT-style instant loading)
  const getConversationFromRedux = (id: string): Conversation | null => {
    const conv = reduxConversations.find(c => c.id === id);
    if (conv && conv.messages && conv.messages.length > 0) {
      return conv;
    }
    return null;
  };

  const { data, isLoading, error, isFetched } = useQuery({
    queryKey: ['conversations'],
    staleTime: 2 * 60 * 1000, // 2 min: avoid refetch on focus/navigation so chat panel doesn't flash
    queryFn: async () => {
      // Simulate API delay for loading indicator visibility (only on initial load)
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await conversationsApi.getAll();
      const conversations = response.conversations.map(deserializeConversation);

      // Sync with Redux store - serialize dates to strings for Redux
      const serializedConversations = conversations.map(serializeConversationForRedux);
      dispatch(loadMockData(serializedConversations));

      // Deserialize group dates
      const groupsWithDates = response.groups.map((group: Record<string, unknown>) => ({
        ...group,
        createdAt: group.createdAt ? new Date(asDateInput(group.createdAt)) : undefined,
        updatedAt: group.updatedAt ? new Date(asDateInput(group.updatedAt)) : undefined,
      }));

      return {
        conversations,
        groups: groupsWithDates,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: (title?: string) => conversationsApi.create(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { title?: string; starred?: boolean; archived?: boolean } }) =>
      conversationsApi.update(id, updates),
    onSuccess: (data, variables) => {
      // Update Redux directly from API response to keep in sync
      if (variables.updates.title) {
        dispatch(updateConversationTitle({ id: variables.id, title: variables.updates.title }));
      }
      // Don't call toggleStarConversation/toggleArchiveConversation here - it's already called optimistically in the component
      // The Redux state is already correct from the optimistic update

      // Don't invalidate query for starred/title/archived updates - we've already updated Redux optimistically
      // Invalidating would cause a refetch that might return stale data before API is fully synced,
      // causing flickering as the conversation moves between starred/recent/archived sections
      // The merge logic in loadMockData will handle syncing when the query is refetched for other reasons
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => conversationsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      dispatch(deleteConvAction(id));
    },
  });

  /**
   * Fetch a single conversation by ID (hits events table via GET /api/conversations/:id).
   * Optimized ChatGPT-style: Check Redux first (instant), then React Query cache, then API.
   * @param id - Conversation UUID
   * @param options - { background: true } to refresh in background without blocking
   */
  const fetchConversationById = async (
    id: string,
    options?: { background?: boolean; force?: boolean }
  ): Promise<Conversation | null> => {
    const CONVERSATION_STALE_MS = 5 * 60 * 1000; // 5 min: don't refetch same conversation if already loaded
    const forceRefresh = options?.force === true;

    // 1. Check Redux first (instant - ChatGPT-style)
    const cachedFromRedux = !forceRefresh ? getConversationFromRedux(id) : null;
    if (cachedFromRedux && !forceRefresh) {
      // If background refresh requested, prefetch fresh data without blocking
      if (options?.background) {
        queryClient.prefetchQuery({
          queryKey: ['conversation', id],
          queryFn: async () => {
            const raw = await conversationsApi.getById(id);
            const conv = deserializeConversation(raw);
            const serialized = serializeConversationForRedux(conv);
            dispatch(upsertConversation(serialized));
            return conv;
          },
          staleTime: CONVERSATION_STALE_MS,
        });
      }
      return cachedFromRedux;
    }

    // 2. Check React Query cache
    const cachedData = !forceRefresh ? queryClient.getQueryData<Conversation>(['conversation', id]) : undefined;
    if (cachedData && !forceRefresh) {
      const serialized = serializeConversationForRedux(cachedData);
      dispatch(upsertConversation(serialized));
      return cachedData;
    }

    // 3. Fetch from API (hits events table)
    try {
      const conv = await queryClient.fetchQuery({
        queryKey: ['conversation', id],
        queryFn: async () => {
          const raw = await conversationsApi.getById(id);
          return deserializeConversation(raw);
        },
        staleTime: forceRefresh ? 0 : CONVERSATION_STALE_MS,
      });
      const serialized = serializeConversationForRedux(conv);
      dispatch(upsertConversation(serialized));
      return conv;
    } catch {
      return null;
    }
  };

  /**
   * Preload conversation on hover (ChatGPT-style optimization).
   * Non-blocking: starts loading in background so click is instant.
   */
  const preloadConversation = (id: string) => {
    // Only preload if not already in Redux with messages
    if (!getConversationFromRedux(id)) {
      queryClient.prefetchQuery({
        queryKey: ['conversation', id],
        queryFn: async () => {
          const raw = await conversationsApi.getById(id);
          const conv = deserializeConversation(raw);
          const serialized = serializeConversationForRedux(conv);
          dispatch(upsertConversation(serialized));
          return conv;
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  };

  return {
    conversations: data?.conversations || [],
    groups: data?.groups || [],
    isLoading,
    isFetched,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
    fetchConversationById,
    preloadConversation,
    createConversation: createMutation.mutate,
    updateConversation: updateMutation.mutate,
    updateConversationAsync: updateMutation.mutateAsync,
    deleteConversation: deleteMutation.mutate,
    deleteConversationAsync: deleteMutation.mutateAsync,
  };
}


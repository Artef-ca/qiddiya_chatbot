import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import {
  addPinnedItem as addPinnedAction,
  removePinnedItem as removePinnedAction,
  updatePinnedItem,
  reorderPinnedItems as reorderAction,
  setPinnedItems,
} from '@/store/slices/pinnedSlice';
import { pinnedApi } from '@/lib/api';
import { deserializeDate } from '@/lib/utils/date';
import type { PinnedItem } from '@/types';

const deserializePinnedItem = (item: any): PinnedItem => ({
  ...item,
  pinnedAt: deserializeDate(item.pinnedAt),
});

const reorderByIds = (items: PinnedItem[], activeId: string, overId: string): PinnedItem[] => {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);

  if (activeIndex === -1 || overIndex === -1) {
    return items;
  }

  const next = [...items];
  const [removed] = next.splice(activeIndex, 1);
  next.splice(overIndex, 0, removed);
  return next;
};

export function usePinnedItems() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['pinnedItems'],
    queryFn: async () => {
      const response = await pinnedApi.getAll();
      return response.items.map(deserializePinnedItem);
    },
  });

  // Hydrate Redux when API data loads - so ChatListItem, ChatMessage, Table/Chart pin icons,
  // and pin counts all show correct state from persisted pinned items
  useEffect(() => {
    if (data !== undefined) {
      const itemsForRedux = data.map((item) => ({
        ...item,
        pinnedAt: typeof item.pinnedAt === 'string' ? item.pinnedAt : (item.pinnedAt as Date).toISOString(),
      }));
      dispatch(setPinnedItems(itemsForRedux));
    }
  }, [data, dispatch]);

  const createMutation = useMutation({
    mutationFn: (item: Omit<PinnedItem, 'pinnedAt'>) => pinnedApi.create(item),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pinnedItems'] });
      dispatch(addPinnedAction({
        ...data,
        pinnedAt: deserializeDate(data.pinnedAt),
      }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { title?: string; note?: string } }) =>
      pinnedApi.update(id, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pinnedItems'] });
      // Use the new updatePinnedItem action that supports both title and note
      dispatch(updatePinnedItem({
        id: variables.id,
        ...(variables.updates.title !== undefined && { title: variables.updates.title }),
        ...(variables.updates.note !== undefined && { note: variables.updates.note }),
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await pinnedApi.delete(id);
      } catch (error) {
        // If item not found (404 or "not found" message), treat as success since it's already deleted
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            return { success: true };
          }
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['pinnedItems'] });
      dispatch(removePinnedAction(id));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ activeId, overId }: { activeId: string; overId: string }) => {
      try {
        return await pinnedApi.reorder(activeId, overId);
      } catch (error) {
        // If endpoint not found (404), treat as success since reorder is also handled in Redux
        // This allows the feature to work even if the API endpoint isn't implemented yet
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
          return { success: true };
        }
        throw error;
      }
    },
    onMutate: async (variables) => {
      const { activeId, overId } = variables;

      await queryClient.cancelQueries({ queryKey: ['pinnedItems'] });
      const previousItems = queryClient.getQueryData<PinnedItem[]>(['pinnedItems']) || [];

      const reorderedItems = reorderByIds(previousItems, activeId, overId);
      queryClient.setQueryData(['pinnedItems'], reorderedItems);
      dispatch(reorderAction(variables));

      return { previousItems };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;

      queryClient.setQueryData(['pinnedItems'], context.previousItems);
      const itemsForRedux = context.previousItems.map((item) => ({
        ...item,
        pinnedAt: typeof item.pinnedAt === 'string' ? item.pinnedAt : item.pinnedAt.toISOString(),
      }));
      dispatch(setPinnedItems(itemsForRedux));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pinnedItems'] });
    },
  });

  return {
    items: data || [],
    isLoading,
    error,
    createPinnedItem: createMutation.mutate,
    updatePinnedItem: updateMutation.mutate,
    updatePinnedItemAsync: updateMutation.mutateAsync,
    deletePinnedItem: deleteMutation.mutate,
    reorderPinnedItems: reorderMutation.mutate,
  };
}


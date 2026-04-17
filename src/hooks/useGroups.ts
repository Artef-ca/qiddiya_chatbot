import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '@/lib/api';

export function useGroups() {
  const queryClient = useQueryClient();

  // Fetch all groups
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const groups = await groupsApi.getAll();
      // Deserialize group dates
      return groups.map((group: any) => ({
        ...group,
        createdAt: group.createdAt ? new Date(group.createdAt) : undefined,
        updatedAt: group.updatedAt ? new Date(group.updatedAt) : undefined,
      }));
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => groupsApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const addConversationsMutation = useMutation({
    mutationFn: ({ groupId, conversationIds }: { groupId: string; conversationIds: string[] }) =>
      groupsApi.addConversations(groupId, conversationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const removeConversationsMutation = useMutation({
    mutationFn: ({ groupId, conversationIds }: { groupId: string; conversationIds: string[] }) =>
      groupsApi.removeConversations(groupId, conversationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: { name?: string; starred?: boolean; archived?: boolean } }) =>
      groupsApi.update(groupId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => groupsApi.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  return {
    groups: groupsData || [],
    isLoading: isLoadingGroups,
    createGroup: createGroupMutation.mutateAsync,
    addConversationsToGroup: addConversationsMutation.mutateAsync,
    removeConversationsFromGroup: removeConversationsMutation.mutateAsync,
    updateGroup: updateGroupMutation.mutateAsync,
    deleteGroup: deleteGroupMutation.mutateAsync,
    isCreatingGroup: createGroupMutation.isPending,
    isAddingConversations: addConversationsMutation.isPending,
    isRemovingConversations: removeConversationsMutation.isPending,
    isUpdatingGroup: updateGroupMutation.isPending,
    isDeletingGroup: deleteGroupMutation.isPending,
  };
}


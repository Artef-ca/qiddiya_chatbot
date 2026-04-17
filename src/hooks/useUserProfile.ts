import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api';

export function useUserProfile() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userApi.getProfile(),
    retry: false, // Don't retry on 401 errors
    // Don't throw on 401 - it's expected when not authenticated
    throwOnError: false,
  });

  return {
    user: data,
    isLoading,
    error,
  };
}


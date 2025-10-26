'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { UserResponse } from '@/features/auth/lib/dto';

export const useUser = () => {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await apiClient.get<UserResponse>('/user/me');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};

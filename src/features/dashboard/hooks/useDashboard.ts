import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { TestHistoryResponseSchema } from '../lib/dto';

export const useDashboard = (page: number, search?: string) => {
  return useQuery({
    queryKey: ['saju-tests', page, search],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/saju/tests', {
        params: { page, limit: 10, search },
      });
      return TestHistoryResponseSchema.parse(data);
    },
    staleTime: 30_000,
  });
};

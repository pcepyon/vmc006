import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { TestDetailResponseSchema } from '../lib/dto';

export const useTestDetail = (testId: string) => {
  return useQuery({
    queryKey: ['saju-test', testId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/saju/tests/${testId}`);
      return TestDetailResponseSchema.parse(data);
    },
    enabled: Boolean(testId),
    staleTime: 60_000,
  });
};

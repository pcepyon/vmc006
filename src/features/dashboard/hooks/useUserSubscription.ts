import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { UserSubscriptionSchema } from '../lib/dto';

export const useUserSubscription = () => {
  return useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/user/subscription');
      return UserSubscriptionSchema.parse(data);
    },
    staleTime: 30_000,
  });
};

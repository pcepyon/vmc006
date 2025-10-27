'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type {
  SubscriptionInfo,
  ConfirmBillingRequest,
  ConfirmBillingResponse,
  CancelSubscriptionResponse,
} from '@/features/subscription/lib/dto';

const subscriptionKeys = {
  all: ['subscription'] as const,
  info: () => [...subscriptionKeys.all, 'info'] as const,
};

/**
 * 구독 정보 조회
 */
export const useSubscriptionInfo = () => {
  return useQuery<SubscriptionInfo>({
    queryKey: subscriptionKeys.info(),
    queryFn: async () => {
      const response = await apiClient.get('/api/subscription');
      return response.data;
    },
  });
};

/**
 * 빌링키 발급 확정
 */
export const useConfirmBilling = () => {
  const queryClient = useQueryClient();

  return useMutation<ConfirmBillingResponse, Error, ConfirmBillingRequest>({
    mutationFn: async (data) => {
      const response = await apiClient.post('/api/subscription/billing/confirm', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.info() });
    },
  });
};

/**
 * 구독 취소
 */
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<CancelSubscriptionResponse, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post('/api/subscription/cancel');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.info() });
    },
  });
};

/**
 * 구독 재활성화
 */
export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string; nextBillingDate: string }, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post('/api/subscription/reactivate');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.info() });
    },
  });
};

import { z } from 'zod';

// 구독 정보 조회 응답
export const SubscriptionInfoSchema = z.object({
  subscriptionTier: z.enum(['free', 'pro']),
  remainingTests: z.number().int().min(0),
  subscription: z
    .object({
      status: z.enum(['active', 'cancelled', 'expired']),
      nextBillingDate: z.string().nullable(),
      cardCompany: z.string().nullable(),
      cardNumber: z.string().nullable(),
    })
    .nullable(),
});

export type SubscriptionInfo = z.infer<typeof SubscriptionInfoSchema>;

// 빌링키 발급 확정 요청
export const ConfirmBillingRequestSchema = z.object({
  customerKey: z.string().min(1),
  authKey: z.string().min(1),
});

export type ConfirmBillingRequest = z.infer<typeof ConfirmBillingRequestSchema>;

// 빌링키 발급 확정 응답
export const ConfirmBillingResponseSchema = z.object({
  message: z.string(),
  subscriptionTier: z.enum(['pro']),
  remainingTests: z.number(),
  nextBillingDate: z.string(),
});

export type ConfirmBillingResponse = z.infer<typeof ConfirmBillingResponseSchema>;

// 구독 취소 응답
export const CancelSubscriptionResponseSchema = z.object({
  message: z.string(),
  expiryDate: z.string(),
});

export type CancelSubscriptionResponse = z.infer<typeof CancelSubscriptionResponseSchema>;

// DB Row Schemas
export const SubscriptionRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  customer_key: z.string().nullable(),
  billing_key: z.string().nullable(),
  card_company: z.string().nullable(),
  card_number: z.string().nullable(),
  status: z.enum(['active', 'cancelled', 'expired']),
  next_billing_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SubscriptionRow = z.infer<typeof SubscriptionRowSchema>;

export const UserRowSchema = z.object({
  id: z.string(),
  subscription_tier: z.enum(['free', 'pro']),
  remaining_tests: z.number(),
});

export type UserRow = z.infer<typeof UserRowSchema>;

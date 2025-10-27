/**
 * Cron 요청/응답 Zod 스키마 정의
 */

import { z } from 'zod';

/**
 * Cron 요청 스키마
 */
export const CronRequestSchema = z.object({
  timestamp: z.string().datetime(),
});

export type CronRequest = z.infer<typeof CronRequestSchema>;

/**
 * 정기결제 Cron 결과 스키마
 */
export const BillingResultSchema = z.object({
  userId: z.string(),
  subscriptionId: z.string().uuid(),
  status: z.enum(['success', 'failed']),
  paymentId: z.string().uuid().optional(),
  nextBillingDate: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

export type BillingResult = z.infer<typeof BillingResultSchema>;

/**
 * 정기결제 Cron 응답 스키마
 */
export const BillingCronResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  processedCount: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  results: z.array(BillingResultSchema),
  executionTimeMs: z.number(),
});

export type BillingCronResponse = z.infer<typeof BillingCronResponseSchema>;

/**
 * 구독 만료 Cron 결과 스키마
 */
export const ExpireResultSchema = z.object({
  userId: z.string(),
  subscriptionId: z.string().uuid(),
  expiredDate: z.string(),
  newTier: z.enum(['free']),
  newRemainingTests: z.number(),
});

export type ExpireResult = z.infer<typeof ExpireResultSchema>;

/**
 * 구독 만료 Cron 응답 스키마
 */
export const ExpireCronResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  expiredCount: z.number(),
  results: z.array(ExpireResultSchema),
  executionTimeMs: z.number(),
});

export type ExpireCronResponse = z.infer<typeof ExpireCronResponseSchema>;

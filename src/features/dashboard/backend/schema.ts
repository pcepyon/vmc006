import { z } from 'zod';

// ============================
// Query Parameter Schemas
// ============================

export const TestHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
});

export type TestHistoryQuery = z.infer<typeof TestHistoryQuerySchema>;

export const TestDetailParamsSchema = z.object({
  id: z.string().uuid({ message: 'Test ID must be a valid UUID.' }),
});

export type TestDetailParams = z.infer<typeof TestDetailParamsSchema>;

// ============================
// Table Row Schemas
// ============================

export const SajuTestRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  test_name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  is_birth_time_unknown: z.boolean(),
  gender: z.enum(['male', 'female']),
  status: z.enum(['processing', 'completed', 'failed']),
  ai_model: z.string(),
  summary_result: z.string().nullable(),
  full_result: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});

export type SajuTestRow = z.infer<typeof SajuTestRowSchema>;

export const UserInfoRowSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  subscription_tier: z.enum(['free', 'pro']),
  remaining_tests: z.number().int().min(0),
});

export type UserInfoRow = z.infer<typeof UserInfoRowSchema>;

// ============================
// Response Schemas
// ============================

export const TestHistoryItemSchema = z.object({
  id: z.string().uuid(),
  test_name: z.string(),
  birth_date: z.string(),
  gender: z.enum(['male', 'female']),
  status: z.enum(['processing', 'completed', 'failed']),
  created_at: z.string(),
});

export type TestHistoryItem = z.infer<typeof TestHistoryItemSchema>;

export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  total_pages: z.number().int().min(0),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const TestHistoryResponseSchema = z.object({
  tests: z.array(TestHistoryItemSchema),
  pagination: PaginationSchema,
  search_query: z.string().optional(),
});

export type TestHistoryResponse = z.infer<typeof TestHistoryResponseSchema>;

export const TestDetailResponseSchema = z.object({
  id: z.string().uuid(),
  test_name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  is_birth_time_unknown: z.boolean(),
  gender: z.enum(['male', 'female']),
  status: z.enum(['processing', 'completed', 'failed']),
  ai_model: z.string(),
  summary_result: z.string().nullable(),
  full_result: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});

export type TestDetailResponse = z.infer<typeof TestDetailResponseSchema>;

export const UserSubscriptionSchema = z.object({
  subscription_tier: z.enum(['free', 'pro']),
  remaining_tests: z.number().int().min(0),
});

export type UserSubscription = z.infer<typeof UserSubscriptionSchema>;

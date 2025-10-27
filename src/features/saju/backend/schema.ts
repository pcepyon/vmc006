import { z } from 'zod'

/**
 * 사주 검사 요청 스키마
 */
export const AnalyzeSajuRequestSchema = z.object({
  test_name: z.string().min(2, '이름은 2자 이상이어야 합니다').max(50, '이름은 50자 이하여야 합니다'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)'),
  birth_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, '올바른 시간 형식이 아닙니다 (HH:MM:SS)').optional(),
  is_birth_time_unknown: z.boolean().default(false),
  gender: z.enum(['male', 'female'], { message: '성별을 선택해주세요' }),
})

export type AnalyzeSajuRequest = z.infer<typeof AnalyzeSajuRequestSchema>

/**
 * 사주 검사 결과 응답 스키마
 */
export const SajuTestResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  test_name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  is_birth_time_unknown: z.boolean(),
  gender: z.enum(['male', 'female']),
  status: z.enum(['processing', 'completed', 'failed']),
  model_used: z.string(),
  summary_result: z.string().nullable(),
  full_result: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
  updated_at: z.string(),
})

export type SajuTestResponse = z.infer<typeof SajuTestResponseSchema>

/**
 * 사주 검사 목록 조회 쿼리 스키마
 */
export const GetSajuTestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
})

export type GetSajuTestListQuery = z.infer<typeof GetSajuTestListQuerySchema>

/**
 * 사주 검사 목록 응답 스키마
 */
export const SajuTestListResponseSchema = z.object({
  tests: z.array(SajuTestResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

export type SajuTestListResponse = z.infer<typeof SajuTestListResponseSchema>

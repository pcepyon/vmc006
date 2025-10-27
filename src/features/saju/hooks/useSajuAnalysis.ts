'use client'

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client'
import type {
  AnalyzeSajuRequest,
  SajuTestResponse,
  SajuTestListResponse,
  GetSajuTestListQuery,
} from '../lib/dto'

const SAJU_QUERY_KEYS = {
  all: ['saju'] as const,
  tests: () => [...SAJU_QUERY_KEYS.all, 'tests'] as const,
  test: (testId: string) => [...SAJU_QUERY_KEYS.tests(), testId] as const,
  testList: (filters: GetSajuTestListQuery) => [...SAJU_QUERY_KEYS.tests(), 'list', filters] as const,
}

/**
 * 사주 분석 수행 Mutation
 */
export function useAnalyzeSaju() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AnalyzeSajuRequest) => {
      const response = await apiClient.post<{ testId: string; summary: string }>('/api/saju/analyze', data)
      return response.data
    },
    onSuccess: () => {
      // 검사 목록 무효화
      queryClient.invalidateQueries({ queryKey: SAJU_QUERY_KEYS.tests() })
    },
    onError: (error: unknown) => {
      const message = extractApiErrorMessage(error, '검사 수행 중 오류가 발생했습니다')
      console.error('[useSajuAnalysis] Analyze error:', message)
    },
  })
}

/**
 * 검사 결과 조회 Query
 * @param testId - 검사 ID
 * @param options - React Query 옵션 (폴링 간격 등)
 */
export function useSajuTest(
  testId: string,
  options?: {
    refetchInterval?: number | ((query: any) => number | false)
    enabled?: boolean
  }
) {
  return useQuery<SajuTestResponse>({
    queryKey: SAJU_QUERY_KEYS.test(testId),
    queryFn: async () => {
      const response = await apiClient.get<SajuTestResponse>(`/api/saju/tests/${testId}`)
      return response.data
    },
    enabled: options?.enabled ?? !!testId,
    refetchInterval: options?.refetchInterval,
    retry: false,
  })
}

/**
 * 검사 이력 목록 Query
 * @param page - 페이지 번호 (기본: 1)
 * @param search - 검색어 (선택)
 */
export function useSajuTestList(page = 1, search = '') {
  return useQuery<SajuTestListResponse>({
    queryKey: SAJU_QUERY_KEYS.testList({ page, limit: 10, search }),
    queryFn: async () => {
      const response = await apiClient.get<SajuTestListResponse>('/api/saju/tests', {
        params: { page, limit: 10, search },
      })
      return response.data
    },
    retry: false,
  })
}

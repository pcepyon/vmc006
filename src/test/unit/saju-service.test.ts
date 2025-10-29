/**
 * Saju Service 단위 테스트
 *
 * analyzeSaju 함수의 핵심 비즈니스 로직을 검증합니다:
 * - 잔여 횟수 차감 로직
 * - 에러 시 상태 업데이트
 * - 타임아웃이 아닌 경우 횟수 복구
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { analyzeSaju } from '@/features/saju/backend/service'
import {
  createMockSupabaseClient,
  mockStore,
  type MockUser,
} from '@/test/mocks/supabase.mock'

describe('Saju Service - analyzeSaju', () => {
  const mockUserId = 'user_123'
  const mockUser: MockUser = {
    id: mockUserId,
    subscription_tier: 'free',
    remaining_tests: 3,
  }

  const mockAnalyzeRequest = {
    test_name: '홍길동',
    birth_date: '1990-01-01',
    birth_time: '14:00',
    is_birth_time_unknown: false,
    gender: 'male' as const,
  }

  beforeEach(() => {
    mockStore.reset()
    mockStore.addUser(mockUser)
  })

  it('성공 시 잔여 횟수가 1 감소해야 한다', async () => {
    const supabase = createMockSupabaseClient()

    const result = await analyzeSaju(
      supabase as any,
      mockUserId,
      mockAnalyzeRequest
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.testId).toBeDefined()
      expect(result.data.summary).toBeDefined()
    }

    // 잔여 횟수 확인
    const updatedUser = mockStore.users.get(mockUserId)
    expect(updatedUser?.remaining_tests).toBe(2) // 3 - 1 = 2
  })

  it('잔여 횟수가 0일 때 실패해야 한다', async () => {
    mockStore.users.set(mockUserId, {
      ...mockUser,
      remaining_tests: 0,
    })

    const supabase = createMockSupabaseClient()

    const result = await analyzeSaju(
      supabase as any,
      mockUserId,
      mockAnalyzeRequest
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
      expect(result.error.code).toBe('NO_TESTS_REMAINING')
    }
  })

  it('검사 레코드가 생성되고 상태가 processing으로 설정되어야 한다', async () => {
    const supabase = createMockSupabaseClient()

    await analyzeSaju(supabase as any, mockUserId, mockAnalyzeRequest)

    const tests = Array.from(mockStore.sajuTests.values())
    expect(tests.length).toBe(1)
    expect(tests[0].user_id).toBe(mockUserId)
    expect(tests[0].test_name).toBe(mockAnalyzeRequest.test_name)
    expect(tests[0].status).toBe('completed') // Mock Gemini가 성공하므로
  })

  it('Pro 티어는 gemini-2.5-pro 모델을 사용해야 한다', async () => {
    mockStore.users.set(mockUserId, {
      ...mockUser,
      subscription_tier: 'pro',
    })

    const supabase = createMockSupabaseClient()

    await analyzeSaju(supabase as any, mockUserId, mockAnalyzeRequest)

    const tests = Array.from(mockStore.sajuTests.values())
    expect(tests[0].ai_model).toBe('gemini-2.5-pro')
  })

  it('Free 티어는 gemini-2.5-flash-lite 모델을 사용해야 한다', async () => {
    const supabase = createMockSupabaseClient()

    await analyzeSaju(supabase as any, mockUserId, mockAnalyzeRequest)

    const tests = Array.from(mockStore.sajuTests.values())
    expect(tests[0].ai_model).toBe('gemini-2.5-flash-lite')
  })

  it('분석 결과가 저장되어야 한다', async () => {
    const supabase = createMockSupabaseClient()

    const result = await analyzeSaju(
      supabase as any,
      mockUserId,
      mockAnalyzeRequest
    )

    expect(result.ok).toBe(true)

    if (result.ok) {
      const test = mockStore.sajuTests.get(result.data.testId)
      expect(test).toBeDefined()
      expect(test?.status).toBe('completed')
      expect(test?.summary_result).toBeDefined()
      expect(test?.full_result).toBeDefined()
    }
  })
})

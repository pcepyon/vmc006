/**
 * Saju API 통합 테스트
 *
 * Hono 라우터, 미들웨어, Zod 유효성 검사를 통합 테스트합니다.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestApp, resetTestEnvironment } from '@/test/helpers/test-app'
import { mockStore, type MockUser } from '@/test/mocks/supabase.mock'

// requireAuth 미들웨어를 Mock으로 대체
vi.mock('@/backend/middleware/clerk', () => ({
  requireAuth: () => {
    return async (c: any, next: any) => {
      // userId가 이미 설정되어 있으면 통과, 없으면 401 반환
      if (!c.get('userId')) {
        return c.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: '로그인이 필요합니다.',
            },
          },
          401
        )
      }
      await next()
    }
  },
  withClerk: () => {
    return async (c: any, next: any) => {
      await next()
    }
  },
}))

describe('Saju API Integration Tests', () => {
  const mockUserId = 'user_integration_test'
  const mockUser: MockUser = {
    id: mockUserId,
    subscription_tier: 'free',
    remaining_tests: 3,
  }

  beforeEach(() => {
    resetTestEnvironment()
    mockStore.addUser(mockUser)
  })

  describe('POST /api/saju/analyze', () => {
    it('인증 없이 요청 시 401을 반환해야 한다', async () => {
      const app = createTestApp() // 인증 없음

      const res = await app.request('/api/saju/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_name: '홍길동',
          birth_date: '1990-01-01',
          birth_time: '14:00:00',
          is_birth_time_unknown: false,
          gender: 'male',
        }),
      })

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('유효하지 않은 요청 시 400을 반환해야 한다', async () => {
      const app = createTestApp(mockUserId)

      const res = await app.request('/api/saju/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_name: '', // 빈 문자열 (유효성 검사 실패)
          birth_date: 'invalid-date',
          gender: 'invalid',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('올바른 요청 시 200과 testId를 반환해야 한다', async () => {
      const app = createTestApp(mockUserId)

      const res = await app.request('/api/saju/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_name: '홍길동',
          birth_date: '1990-01-01',
          birth_time: '14:00:00',
          is_birth_time_unknown: false,
          gender: 'male',
        }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.testId).toBeDefined()
      expect(json.summary).toBeDefined()
    })

    it('잔여 횟수가 0일 때 403을 반환해야 한다', async () => {
      mockStore.users.set(mockUserId, { ...mockUser, remaining_tests: 0 })
      const app = createTestApp(mockUserId)

      const res = await app.request('/api/saju/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_name: '홍길동',
          birth_date: '1990-01-01',
          birth_time: '14:00:00',
          is_birth_time_unknown: false,
          gender: 'male',
        }),
      })

      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error.code).toBe('NO_TESTS_REMAINING')
    })
  })

  describe('GET /api/saju/tests/:testId', () => {
    it('인증 없이 요청 시 401을 반환해야 한다', async () => {
      const app = createTestApp()

      const res = await app.request('/api/saju/tests/test_123')

      expect(res.status).toBe(401)
    })

    it('존재하지 않는 검사 조회 시 404를 반환해야 한다', async () => {
      const app = createTestApp(mockUserId)

      const res = await app.request('/api/saju/tests/nonexistent_test')

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('올바른 검사 조회 시 200과 검사 정보를 반환해야 한다', async () => {
      const testId = 'test_valid'
      mockStore.addSajuTest({
        id: testId,
        user_id: mockUserId,
        test_name: '홍길동',
        birth_date: '1990-01-01',
        birth_time: '14:00',
        is_birth_time_unknown: false,
        gender: 'male',
        ai_model: 'gemini-2.5-flash-lite',
        status: 'completed',
        summary_result: 'Test summary',
        full_result: 'Full result',
        created_at: new Date().toISOString(),
      })

      const app = createTestApp(mockUserId)

      const res = await app.request(`/api/saju/tests/${testId}`)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.id).toBe(testId)
      expect(json.test_name).toBe('홍길동')
    })
  })

  describe('GET /api/saju/tests', () => {
    it('인증 없이 요청 시 401을 반환해야 한다', async () => {
      const app = createTestApp()

      const res = await app.request('/api/saju/tests?page=1&limit=10')

      expect(res.status).toBe(401)
    })

    it('올바른 요청 시 200과 검사 목록을 반환해야 한다', async () => {
      // 테스트 데이터 추가
      mockStore.addSajuTest({
        id: 'test_1',
        user_id: mockUserId,
        test_name: '테스트1',
        birth_date: '1990-01-01',
        birth_time: '14:00',
        is_birth_time_unknown: false,
        gender: 'male',
        ai_model: 'gemini-2.5-flash-lite',
        status: 'completed',
        created_at: new Date().toISOString(),
      })

      const app = createTestApp(mockUserId)

      const res = await app.request('/api/saju/tests?page=1&limit=10')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.tests).toBeDefined()
      expect(Array.isArray(json.tests)).toBe(true)
      expect(json.pagination).toBeDefined()
      expect(json.pagination.page).toBe(1)
      expect(json.pagination.limit).toBe(10)
    })
  })
})

/**
 * 테스트용 Hono 앱 생성 헬퍼
 *
 * Clerk와 Supabase 미들웨어를 Mocking하여 테스트 환경을 구성합니다.
 */

import { Hono } from 'hono'
import type { AppEnv } from '@/backend/hono/context'
import { errorBoundary } from '@/backend/middleware/error'
import { withAppContext } from '@/backend/middleware/context'
import { registerSajuRoutes } from '@/features/saju/backend/route'
import { registerSubscriptionRoutes } from '@/features/subscription/backend/route'
import { createMockSupabaseClient, mockStore } from '@/test/mocks/supabase.mock'
import { resetConfigCache } from '@/backend/config'

/**
 * 테스트용 Hono 앱 생성
 *
 * @param mockUserId - Mock 사용자 ID (인증된 상태로 테스트)
 */
export function createTestApp(mockUserId?: string) {
  const app = new Hono<AppEnv>().basePath('/api')

  // 1. 에러 바운더리
  app.use('*', errorBoundary())

  // 2. 앱 컨텍스트
  app.use('*', withAppContext())

  // 3. Mock Clerk 인증 (테스트용)
  app.use('*', async (c, next) => {
    // Mock getAuth 함수를 컨텍스트에 주입
    if (mockUserId) {
      c.set('userId', mockUserId)
    }
    await next()
  })

  // 4. Mock Supabase (테스트용)
  app.use('*', async (c, next) => {
    const mockSupabase = createMockSupabaseClient()
    c.set('supabase', mockSupabase as any)
    await next()
  })

  // 5. 라우터 등록
  registerSajuRoutes(app)
  registerSubscriptionRoutes(app)

  return app
}

/**
 * requireAuth 미들웨어 Mock
 *
 * 테스트에서 인증이 필요한 엔드포인트를 테스트할 때 사용합니다.
 */
export function mockRequireAuth(userId: string) {
  return async (c: any, next: any) => {
    c.set('userId', userId)
    await next()
  }
}

/**
 * 테스트 전 Mock 스토어 초기화
 */
export function resetTestEnvironment() {
  mockStore.reset()
  resetConfigCache()
}

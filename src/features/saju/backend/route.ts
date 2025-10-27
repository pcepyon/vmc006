import type { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { respond } from '@/backend/http/response'
import { getSupabase, getUserId, type AppEnv } from '@/backend/hono/context'
import { requireAuth } from '@/backend/middleware/clerk'
import { analyzeSaju, getSajuTest, getSajuTestList } from './service'
import { AnalyzeSajuRequestSchema, GetSajuTestListQuerySchema } from './schema'

/**
 * 사주 검사 라우터 등록
 */
export const registerSajuRoutes = (app: Hono<AppEnv>) => {
  // POST /saju/analyze - 새 검사 수행
  app.post('/saju/analyze', requireAuth(), zValidator('json', AnalyzeSajuRequestSchema), async (c) => {
    const userId = getUserId(c)!
    const supabase = getSupabase(c)
    const data = c.req.valid('json')

    const result = await analyzeSaju(supabase, userId, data)
    return respond(c, result)
  })

  // GET /saju/tests/:testId - 검사 결과 조회
  app.get('/saju/tests/:testId', requireAuth(), async (c) => {
    const userId = getUserId(c)!
    const supabase = getSupabase(c)
    const testId = c.req.param('testId')

    const result = await getSajuTest(supabase, userId, testId)
    return respond(c, result)
  })

  // GET /saju/tests - 검사 이력 목록
  app.get('/saju/tests', requireAuth(), zValidator('query', GetSajuTestListQuerySchema), async (c) => {
    const userId = getUserId(c)!
    const supabase = getSupabase(c)
    const query = c.req.valid('query')

    const result = await getSajuTestList(supabase, userId, query)
    return respond(c, result)
  })
}

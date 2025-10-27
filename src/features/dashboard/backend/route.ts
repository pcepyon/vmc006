import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '@/backend/hono/context';
import { requireAuth } from '@/backend/middleware/clerk';
import { respond } from '@/backend/http/response';
import { TestHistoryQuerySchema, TestDetailParamsSchema } from './schema';
import { getTestHistory, getTestById, getUserSubscription } from './service';

const dashboardRoutes = new Hono<AppEnv>()
  // 검사 이력 목록 조회 (페이지네이션 + 검색)
  .get(
    '/saju/tests',
    requireAuth(),
    zValidator('query', TestHistoryQuerySchema),
    async (c) => {
      const userId = c.get('userId')!;
      const query = c.req.valid('query');
      const supabase = c.get('supabase');

      const result = await getTestHistory(supabase, { ...query, userId });
      return respond(c, result);
    },
  )

  // 검사 결과 상세 조회
  .get(
    '/saju/tests/:id',
    requireAuth(),
    zValidator('param', TestDetailParamsSchema),
    async (c) => {
      const userId = c.get('userId')!;
      const { id: testId } = c.req.valid('param');
      const supabase = c.get('supabase');

      const result = await getTestById(supabase, { userId, testId });
      return respond(c, result);
    },
  )

  // 사용자 구독 정보 조회
  .get('/user/subscription', requireAuth(), async (c) => {
    const userId = c.get('userId')!;
    const supabase = c.get('supabase');

    const result = await getUserSubscription(supabase, { userId });
    return respond(c, result);
  });

export const registerDashboardRoutes = (app: Hono<AppEnv>) => {
  app.route('/', dashboardRoutes);
};

import type { Hono } from 'hono';
import { requireAuth } from '@/backend/middleware/clerk';
import { respond, type ErrorResult } from '@/backend/http/response';
import {
  getSupabase,
  getLogger,
  getUserId,
  type AppEnv,
} from '@/backend/hono/context';
import { getUserById } from './service';
import type { AuthServiceError } from './error';

export const registerAuthRoutes = (app: Hono<AppEnv>) => {
  /**
   * GET /user/me
   * 현재 로그인한 사용자 정보 조회
   */
  app.get('/user/me', requireAuth(), async (c) => {
    const userId = getUserId(c);
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    if (!userId) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'User ID not found in context',
          },
        },
        401,
      );
    }

    const result = await getUserById(supabase, userId);

    if (!result.ok) {
      const errorResult = result as ErrorResult<AuthServiceError, unknown>;
      logger.error('Failed to fetch user:', {
        code: errorResult.error.code,
        message: errorResult.error.message,
      });
    }

    return respond(c, result);
  });
};

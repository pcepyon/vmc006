import { Hono } from 'hono';
import { errorBoundary } from '@/backend/middleware/error';
import { withAppContext } from '@/backend/middleware/context';
import { withClerk } from '@/backend/middleware/clerk';
import { withSupabase } from '@/backend/middleware/supabase';
import { registerExampleRoutes } from '@/features/example/backend/route';
import { registerAuthRoutes } from '@/features/auth/backend/route';
import { registerDashboardRoutes } from '@/features/dashboard/backend/route';
import { registerSajuRoutes } from '@/features/saju/backend/route';
import { registerSubscriptionRoutes } from '@/features/subscription/backend/route';
import type { AppEnv } from '@/backend/hono/context';

let singletonApp: Hono<AppEnv> | null = null;

export const createHonoApp = () => {
  if (singletonApp) {
    return singletonApp;
  }

  const app = new Hono<AppEnv>().basePath('/api');

  // 1. 에러 바운더리
  app.use('*', errorBoundary());

  // 2. 앱 컨텍스트 (logger, config)
  app.use('*', withAppContext());

  // 3. Clerk 인증 미들웨어
  app.use('*', withClerk());

  // 4. Supabase 클라이언트
  app.use('*', withSupabase());

  // 5. 라우터 등록
  registerExampleRoutes(app);
  registerAuthRoutes(app);
  registerDashboardRoutes(app);
  registerSajuRoutes(app);
  registerSubscriptionRoutes(app);

  singletonApp = app;

  return app;
};

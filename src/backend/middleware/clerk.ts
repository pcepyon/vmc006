import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '@/backend/hono/context';
import { getAppConfig } from '@/backend/config';

/**
 * Clerk JWT 검증 미들웨어
 * - Hono 컨텍스트에 Clerk 인증 정보 주입
 */
export const withClerk = (): MiddlewareHandler<AppEnv> => {
  const config = getAppConfig();

  return clerkMiddleware({
    publishableKey: config.clerk.publishableKey,
    secretKey: config.clerk.secretKey,
  });
};

/**
 * 인증 필수 미들웨어
 * - 로그인하지 않은 사용자 차단 (401 반환)
 */
export const requireAuth = (): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: '로그인이 필요합니다.',
          },
        },
        401,
      );
    }

    // Context에 userId 저장
    c.set('userId', auth.userId);
    await next();
  };
};

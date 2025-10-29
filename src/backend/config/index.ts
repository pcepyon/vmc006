import { z } from 'zod';
import type { AppConfig } from '@/backend/hono/context';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
});

let cachedConfig: AppConfig | null = null;

/**
 * 테스트 환경에서 캐시를 초기화합니다.
 */
export const resetConfigCache = () => {
  cachedConfig = null;
};

export const getAppConfig = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  // 빌드 시에는 더미 환경변수 사용
  const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL;

  const parsed = envSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL || (isBuildTime ? 'https://dummy.supabase.co' : undefined),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || (isBuildTime ? 'dummy-key' : undefined),
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || (isBuildTime ? 'sk_test_dummy' : undefined),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || (isBuildTime ? 'pk_test_dummy' : undefined),
  });

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid backend configuration: ${messages}`);
  }

  cachedConfig = {
    supabase: {
      url: parsed.data.SUPABASE_URL,
      serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    },
    clerk: {
      secretKey: parsed.data.CLERK_SECRET_KEY,
      publishableKey: parsed.data.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    },
  } satisfies AppConfig;

  return cachedConfig;
};

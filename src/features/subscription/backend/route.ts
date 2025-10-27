import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getLogger, getSupabase, getUserId, type AppEnv } from '@/backend/hono/context';
import { requireAuth } from '@/backend/middleware/clerk';
import { zValidator } from '@hono/zod-validator';
import {
  ConfirmBillingRequestSchema,
  type ConfirmBillingResponse,
} from './schema';
import {
  getSubscriptionInfo,
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
} from './service';
import { issueBillingKey } from './toss-service';
import { subscriptionErrorCodes } from './error';
import { CronRequestSchema } from './cronSchema';
import { processBillingCron, processExpireCron } from './cronService';
import { cronErrorCodes } from './cronError';

export const registerSubscriptionRoutes = (app: Hono<AppEnv>) => {
  // 구독 정보 조회
  app.get('/subscription', requireAuth(), async (c) => {
    const userId = getUserId(c)!;
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await getSubscriptionInfo(supabase, userId);

    if (!result.ok) {
      logger.error('Failed to fetch subscription info', result);
    }

    return respond(c, result);
  });

  // 빌링키 발급 확정
  app.post(
    '/subscription/billing/confirm',
    requireAuth(),
    zValidator('json', ConfirmBillingRequestSchema),
    async (c) => {
      const userId = getUserId(c)!;
      const supabase = getSupabase(c);
      const logger = getLogger(c);

      const { customerKey, authKey } = c.req.valid('json');

      // 1. 토스 페이먼츠 빌링키 발급
      const billingResult = await issueBillingKey(authKey, customerKey);
      if (!billingResult.ok) {
        logger.error('Billing key issue failed', billingResult);
        return respond(c, billingResult);
      }

      const { billingKey, card } = billingResult.data;

      // 2. 다음 결제일 계산 (현재 날짜 + 1개월)
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      const nextBillingDateStr = nextBillingDate.toISOString().split('T')[0];

      // 3. 구독 생성 (트랜잭션)
      const createResult = await createSubscription(
        supabase,
        userId,
        customerKey,
        billingKey,
        card.company,
        card.number,
        nextBillingDateStr,
      );

      if (!createResult.ok) {
        logger.error('Subscription creation failed', createResult);
        return respond(c, createResult);
      }

      const response: ConfirmBillingResponse = {
        message: '구독이 완료되었습니다',
        subscriptionTier: 'pro',
        remainingTests: 10,
        nextBillingDate: nextBillingDateStr,
      };

      return c.json(response, 200);
    },
  );

  // 구독 취소
  app.post('/subscription/cancel', requireAuth(), async (c) => {
    const userId = getUserId(c)!;
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await cancelSubscription(supabase, userId);

    if (!result.ok) {
      logger.error('Subscription cancellation failed', result);
      return respond(c, result);
    }

    return c.json(
      {
        message: `구독이 취소되었습니다. ${result.data.expiryDate}까지 이용 가능합니다`,
        expiryDate: result.data.expiryDate,
      },
      200,
    );
  });

  // 구독 재활성화
  app.post('/subscription/reactivate', requireAuth(), async (c) => {
    const userId = getUserId(c)!;
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await reactivateSubscription(supabase, userId);

    if (!result.ok) {
      logger.error('Subscription reactivation failed', result);
      return respond(c, result);
    }

    return c.json(
      {
        message: '구독이 재활성화되었습니다',
        nextBillingDate: result.data.nextBillingDate,
      },
      200,
    );
  });

  // 정기결제 Cron 엔드포인트
  app.post(
    '/subscription/billing/cron',
    zValidator('json', CronRequestSchema),
    async (c) => {
      const supabase = getSupabase(c);
      const logger = getLogger(c);

      // Secret Token 검증
      const cronSecret = c.req.header('X-Cron-Secret');
      const expectedSecret = process.env.CRON_SECRET_TOKEN || '';

      if (!cronSecret || cronSecret !== expectedSecret) {
        logger.error('Cron 인증 실패: Invalid secret token');
        return respond(c, failure(401, cronErrorCodes.unauthorized, '인증 실패'));
      }

      const { timestamp } = c.req.valid('json');
      logger.info('정기결제 Cron 시작', { timestamp });

      const result = await processBillingCron(supabase);

      if (!result.ok) {
        logger.error('정기결제 Cron 실패', 'error' in result ? result.error : '알 수 없는 오류');
      } else {
        logger.info('정기결제 Cron 완료', {
          processedCount: result.data.processedCount,
          successCount: result.data.successCount,
          failureCount: result.data.failureCount,
          executionTimeMs: result.data.executionTimeMs,
        });
      }

      return respond(c, result);
    },
  );

  // 구독 만료 처리 Cron 엔드포인트
  app.post(
    '/subscription/expire/cron',
    zValidator('json', CronRequestSchema),
    async (c) => {
      const supabase = getSupabase(c);
      const logger = getLogger(c);

      // Secret Token 검증
      const cronSecret = c.req.header('X-Cron-Secret');
      const expectedSecret = process.env.CRON_SECRET_TOKEN || '';

      if (!cronSecret || cronSecret !== expectedSecret) {
        logger.error('Cron 인증 실패: Invalid secret token');
        return respond(c, failure(401, cronErrorCodes.unauthorized, '인증 실패'));
      }

      const { timestamp } = c.req.valid('json');
      logger.info('구독 만료 Cron 시작', { timestamp });

      const result = await processExpireCron(supabase);

      if (!result.ok) {
        logger.error('구독 만료 Cron 실패', 'error' in result ? result.error : '알 수 없는 오류');
      } else {
        logger.info('구독 만료 Cron 완료', {
          expiredCount: result.data.expiredCount,
          executionTimeMs: result.data.executionTimeMs,
        });
      }

      return respond(c, result);
    },
  );
};

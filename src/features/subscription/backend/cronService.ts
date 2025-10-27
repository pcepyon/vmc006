/**
 * 정기결제 및 구독 만료 비즈니스 로직
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { chargeBillingKey } from './tossPayments';
import type { BillingResult, ExpireResult } from './cronSchema';
import { failure, success, type HandlerResult } from '@/backend/http/response';
import { cronErrorCodes, type CronServiceError } from './cronError';

const PRO_SUBSCRIPTION_AMOUNT = 9900;
const PRO_MONTHLY_TESTS = 10;

/**
 * 중복 실행 방지: 오늘 날짜에 이미 실행된 작업인지 확인
 */
const checkDuplicateExecution = async (
  client: SupabaseClient,
  jobName: string,
): Promise<{ isDuplicate: boolean; logId: string | null }> => {
  const today = new Date().toISOString().split('T')[0];

  const { data: existingLog } = await client
    .from('cron_execution_log')
    .select('id, status')
    .eq('job_name', jobName)
    .eq('execution_date', today)
    .maybeSingle();

  if (existingLog) {
    return { isDuplicate: true, logId: existingLog.id };
  }

  const { data: newLog, error } = await client
    .from('cron_execution_log')
    .insert({
      job_name: jobName,
      execution_date: today,
      status: 'running',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`실행 로그 생성 실패: ${error.message}`);
  }

  return { isDuplicate: false, logId: newLog.id };
};

/**
 * 실행 로그 완료 처리
 */
const completeExecutionLog = async (
  client: SupabaseClient,
  logId: string,
  status: 'completed' | 'failed',
  counts: {
    processedCount?: number;
    successCount?: number;
    failureCount?: number;
  },
  executionTimeMs: number,
  errorMessage?: string,
): Promise<void> => {
  await client
    .from('cron_execution_log')
    .update({
      status,
      processed_count: counts.processedCount ?? 0,
      success_count: counts.successCount ?? 0,
      failure_count: counts.failureCount ?? 0,
      execution_time_ms: executionTimeMs,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);
};

/**
 * 정기결제 자동화 서비스
 *
 * 오늘이 결제일인 활성 구독에 대해 토스 페이먼츠 빌링키 결제를 수행하고,
 * 결제 성공 시 구독 연장 및 횟수 초기화,
 * 결제 실패 시 구독 해지 및 등급 다운그레이드
 */
export const processBillingCron = async (
  client: SupabaseClient,
): Promise<
  HandlerResult<
    {
      processedCount: number;
      successCount: number;
      failureCount: number;
      results: BillingResult[];
      executionTimeMs: number;
    },
    CronServiceError,
    unknown
  >
> => {
  const startTime = Date.now();
  const jobName = 'recurring-payment-trigger';

  try {
    const { isDuplicate, logId } = await checkDuplicateExecution(client, jobName);

    if (isDuplicate || !logId) {
      return failure(
        409,
        cronErrorCodes.alreadyProcessed,
        '오늘 날짜의 정기결제가 이미 처리되었습니다',
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: subscriptions, error: fetchError } = await client
      .from('subscriptions')
      .select('id, user_id, billing_key, customer_key, next_billing_date')
      .eq('status', 'active')
      .eq('next_billing_date', today);

    if (fetchError) {
      const executionTimeMs = Date.now() - startTime;
      await completeExecutionLog(
        client,
        logId,
        'failed',
        {},
        executionTimeMs,
        fetchError.message,
      );
      return failure(
        500,
        cronErrorCodes.billingFetchError,
        `구독 조회 실패: ${fetchError.message}`,
        fetchError,
      );
    }

    const results: BillingResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions || []) {
      const orderId = `AUTO_${Date.now()}_${sub.user_id}`;

      try {
        const paymentResult = await chargeBillingKey(
          sub.billing_key!,
          sub.customer_key!,
          PRO_SUBSCRIPTION_AMOUNT,
          orderId,
          'Pro 요금제 월 구독',
        );

        if (!paymentResult.ok) {
          const errorMsg = 'error' in paymentResult ? paymentResult.error.message : '결제 실패';
          throw new Error(errorMsg);
        }

        const payment = paymentResult.data;

        const nextBillingDate = new Date(sub.next_billing_date!);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        const nextBillingDateStr = nextBillingDate.toISOString().split('T')[0];

        const { data: paymentRecord, error: paymentError } = await client
          .from('payments')
          .insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            payment_key: payment.paymentKey,
            order_id: orderId,
            amount: PRO_SUBSCRIPTION_AMOUNT,
            status: 'SUCCESS',
            method: 'cron_auto_billing',
            paid_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (paymentError) {
          throw new Error(`결제 기록 저장 실패: ${paymentError.message}`);
        }

        await client
          .from('subscriptions')
          .update({ next_billing_date: nextBillingDateStr })
          .eq('id', sub.id);

        await client
          .from('users')
          .update({ remaining_tests: PRO_MONTHLY_TESTS })
          .eq('id', sub.user_id);

        results.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          status: 'success',
          paymentId: paymentRecord.id,
          nextBillingDate: nextBillingDateStr,
        });

        successCount++;
      } catch (error: any) {
        await client.from('payments').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          order_id: orderId,
          amount: PRO_SUBSCRIPTION_AMOUNT,
          status: 'FAILED',
          method: 'cron_auto_billing',
          error_message: error.message,
        });

        await client
          .from('subscriptions')
          .update({
            status: 'expired',
            billing_key: null,
            customer_key: null,
            next_billing_date: null,
          })
          .eq('id', sub.id);

        await client
          .from('users')
          .update({
            subscription_tier: 'free',
            remaining_tests: 0,
          })
          .eq('id', sub.user_id);

        results.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          status: 'failed',
          errorCode: 'PAYMENT_FAILED',
          errorMessage: error.message,
        });

        failureCount++;
      }
    }

    const executionTimeMs = Date.now() - startTime;

    await completeExecutionLog(
      client,
      logId,
      'completed',
      {
        processedCount: (subscriptions || []).length,
        successCount,
        failureCount,
      },
      executionTimeMs,
    );

    return success({
      processedCount: (subscriptions || []).length,
      successCount,
      failureCount,
      results,
      executionTimeMs,
    });
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;

    return failure(
      500,
      cronErrorCodes.executionFailed,
      `정기결제 실행 실패: ${error.message}`,
      error,
    );
  }
};

/**
 * 구독 만료 자동화 서비스
 *
 * 해지 예정(cancelled) 상태에서 만료일이 경과한 구독을 expired로 변경하고,
 * 사용자를 무료 등급으로 전환
 */
export const processExpireCron = async (
  client: SupabaseClient,
): Promise<
  HandlerResult<
    {
      expiredCount: number;
      results: ExpireResult[];
      executionTimeMs: number;
    },
    CronServiceError,
    unknown
  >
> => {
  const startTime = Date.now();
  const jobName = 'subscription-expire-trigger';

  try {
    const { isDuplicate, logId } = await checkDuplicateExecution(client, jobName);

    if (isDuplicate || !logId) {
      return failure(
        409,
        cronErrorCodes.alreadyProcessed,
        '오늘 날짜의 구독 만료 처리가 이미 완료되었습니다',
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: subscriptions, error: fetchError } = await client
      .from('subscriptions')
      .select('id, user_id, next_billing_date')
      .eq('status', 'cancelled')
      .lte('next_billing_date', today);

    if (fetchError) {
      const executionTimeMs = Date.now() - startTime;
      await completeExecutionLog(
        client,
        logId,
        'failed',
        {},
        executionTimeMs,
        fetchError.message,
      );
      return failure(
        500,
        cronErrorCodes.expireFetchError,
        `만료 대상 조회 실패: ${fetchError.message}`,
        fetchError,
      );
    }

    const results: ExpireResult[] = [];

    for (const sub of subscriptions || []) {
      await client
        .from('subscriptions')
        .update({
          status: 'expired',
          next_billing_date: null,
        })
        .eq('id', sub.id);

      await client
        .from('users')
        .update({
          subscription_tier: 'free',
          remaining_tests: 0,
        })
        .eq('id', sub.user_id);

      results.push({
        userId: sub.user_id,
        subscriptionId: sub.id,
        expiredDate: sub.next_billing_date!,
        newTier: 'free',
        newRemainingTests: 0,
      });
    }

    const executionTimeMs = Date.now() - startTime;

    await completeExecutionLog(
      client,
      logId,
      'completed',
      {
        processedCount: (subscriptions || []).length,
      },
      executionTimeMs,
    );

    return success({
      expiredCount: (subscriptions || []).length,
      results,
      executionTimeMs,
    });
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;

    return failure(
      500,
      cronErrorCodes.executionFailed,
      `구독 만료 처리 실패: ${error.message}`,
      error,
    );
  }
};

import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, type HandlerResult } from '@/backend/http/response';
import {
  SubscriptionInfoSchema,
  SubscriptionRowSchema,
  UserRowSchema,
  type SubscriptionInfo,
} from './schema';
import { subscriptionErrorCodes, type SubscriptionServiceError } from './error';

/**
 * 구독 정보 조회
 */
export const getSubscriptionInfo = async (
  client: SupabaseClient,
  userId: string,
): Promise<HandlerResult<SubscriptionInfo, SubscriptionServiceError, unknown>> => {
  try {
    // 1. users 테이블에서 subscription_tier, remaining_tests 조회
    const { data: userData, error: userError } = await client
      .from('users')
      .select('id, subscription_tier, remaining_tests')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return failure(
        404,
        subscriptionErrorCodes.notFound,
        '사용자 정보를 찾을 수 없습니다',
        userError,
      );
    }

    const userParse = UserRowSchema.safeParse(userData);
    if (!userParse.success) {
      return failure(
        500,
        subscriptionErrorCodes.validationError,
        '사용자 데이터 검증 실패',
        userParse.error.format(),
      );
    }

    // 2. subscriptions 테이블에서 활성/취소 구독 조회
    const { data: subData, error: subError } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'cancelled'])
      .maybeSingle();

    if (subError) {
      return failure(
        500,
        subscriptionErrorCodes.fetchError,
        '구독 정보 조회 실패',
        subError,
      );
    }

    let subscriptionInfo = null;
    if (subData) {
      const subParse = SubscriptionRowSchema.safeParse(subData);
      if (!subParse.success) {
        return failure(
          500,
          subscriptionErrorCodes.validationError,
          '구독 데이터 검증 실패',
          subParse.error.format(),
        );
      }

      subscriptionInfo = {
        status: subParse.data.status,
        nextBillingDate: subParse.data.next_billing_date,
        cardCompany: subParse.data.card_company,
        cardNumber: subParse.data.card_number,
      };
    }

    const result: SubscriptionInfo = {
      subscriptionTier: userParse.data.subscription_tier,
      remainingTests: userParse.data.remaining_tests,
      subscription: subscriptionInfo,
    };

    const parsed = SubscriptionInfoSchema.safeParse(result);
    if (!parsed.success) {
      return failure(
        500,
        subscriptionErrorCodes.validationError,
        '응답 데이터 검증 실패',
        parsed.error.format(),
      );
    }

    return success(parsed.data);
  } catch (error: any) {
    return failure(
      500,
      subscriptionErrorCodes.fetchError,
      '구독 정보 조회 중 오류 발생',
      error,
    );
  }
};

/**
 * 빌링키 발급 후 구독 생성 (트랜잭션)
 */
export const createSubscription = async (
  client: SupabaseClient,
  userId: string,
  customerKey: string,
  billingKey: string,
  cardCompany: string,
  cardNumber: string,
  nextBillingDate: string,
): Promise<HandlerResult<{ subscriptionId: string }, SubscriptionServiceError, unknown>> => {
  try {
    const { data, error } = await client.rpc('create_subscription_with_user_update', {
      p_user_id: userId,
      p_customer_key: customerKey,
      p_billing_key: billingKey,
      p_card_company: cardCompany,
      p_card_number: cardNumber,
      p_next_billing_date: nextBillingDate,
    });

    if (error) {
      return failure(
        500,
        subscriptionErrorCodes.databaseError,
        '구독 생성 중 오류 발생',
        error,
      );
    }

    return success({ subscriptionId: data.subscription_id });
  } catch (error: any) {
    return failure(
      500,
      subscriptionErrorCodes.databaseError,
      '구독 생성 중 오류 발생',
      error,
    );
  }
};

/**
 * 구독 취소
 */
export const cancelSubscription = async (
  client: SupabaseClient,
  userId: string,
): Promise<HandlerResult<{ expiryDate: string }, SubscriptionServiceError, unknown>> => {
  try {
    // 1. 활성 구독 조회
    const { data: subscription, error: fetchError } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError || !subscription) {
      return failure(
        404,
        subscriptionErrorCodes.noActiveSubscription,
        '해지할 활성 구독이 없습니다',
        fetchError,
      );
    }

    // 2. 구독 상태를 'cancelled'로 변경, billing_key와 customer_key를 NULL로 설정
    const { error: updateError } = await client
      .from('subscriptions')
      .update({
        status: 'cancelled',
        billing_key: null,
        customer_key: null,
      })
      .eq('id', subscription.id);

    if (updateError) {
      return failure(
        500,
        subscriptionErrorCodes.databaseError,
        '구독 취소 중 오류 발생',
        updateError,
      );
    }

    return success({ expiryDate: subscription.next_billing_date! });
  } catch (error: any) {
    return failure(
      500,
      subscriptionErrorCodes.databaseError,
      '구독 취소 중 오류 발생',
      error,
    );
  }
};

/**
 * 구독 재활성화 (현재 정책상 불가능 - 빌링키 삭제됨)
 */
export const reactivateSubscription = async (
  client: SupabaseClient,
  userId: string,
): Promise<HandlerResult<{ nextBillingDate: string }, SubscriptionServiceError, unknown>> => {
  try {
    const { data: subscription, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'cancelled')
      .single();

    if (error || !subscription) {
      return failure(
        404,
        subscriptionErrorCodes.notFound,
        '취소된 구독이 없습니다',
        error,
      );
    }

    // 빌링키가 삭제되었는지 확인
    if (!subscription.billing_key) {
      return failure(
        400,
        subscriptionErrorCodes.billingKeyDeleted,
        '빌링키가 삭제되어 재활성화할 수 없습니다. 새로 구독을 신청해주세요',
      );
    }

    // 만료일 경과 확인
    const today = new Date().toISOString().split('T')[0];
    if (subscription.next_billing_date && subscription.next_billing_date < today) {
      return failure(
        400,
        subscriptionErrorCodes.subscriptionExpired,
        '구독 기간이 만료되어 재활성화할 수 없습니다',
      );
    }

    // 재활성화
    const { error: updateError } = await client
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', subscription.id);

    if (updateError) {
      return failure(
        500,
        subscriptionErrorCodes.databaseError,
        '구독 재활성화 중 오류 발생',
        updateError,
      );
    }

    return success({ nextBillingDate: subscription.next_billing_date! });
  } catch (error: any) {
    return failure(
      500,
      subscriptionErrorCodes.databaseError,
      '구독 재활성화 중 오류 발생',
      error,
    );
  }
};

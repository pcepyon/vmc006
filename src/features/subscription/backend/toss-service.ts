import { failure, success, type HandlerResult } from '@/backend/http/response';
import { subscriptionErrorCodes, type SubscriptionServiceError } from './error';
import { fetchWrapper } from '@/backend/http/fetch-wrapper';

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || '';
const TOSS_API_BASE = 'https://api.tosspayments.com';

const getBasicAuthHeader = () => {
  const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');
  return `Basic ${auth}`;
};

export interface TossBillingData {
  billingKey: string;
  card: {
    company: string;
    number: string;
  };
}

/**
 * 토스 페이먼츠 빌링키 발급 API 호출
 */
export const issueBillingKey = async (
  authKey: string,
  customerKey: string,
): Promise<HandlerResult<TossBillingData, SubscriptionServiceError, unknown>> => {
  try {
    const response = await fetchWrapper(`${TOSS_API_BASE}/v1/billing/authorizations/issue`, {
      method: 'POST',
      headers: {
        Authorization: getBasicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authKey,
        customerKey,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return failure(
        400,
        subscriptionErrorCodes.billingKeyIssueFailed,
        error.message || '빌링키 발급에 실패했습니다',
        error,
      );
    }

    const data = await response.json();
    return success(data);
  } catch (error: any) {
    return failure(
      500,
      subscriptionErrorCodes.billingAuthFailed,
      '빌링키 발급 중 오류가 발생했습니다',
      error,
    );
  }
};

/**
 * 빌링키로 정기결제 승인
 */
export const chargeBilling = async (
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  orderName: string,
): Promise<HandlerResult<any, SubscriptionServiceError, unknown>> => {
  try {
    const response = await fetchWrapper(`${TOSS_API_BASE}/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: getBasicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        amount,
        orderId,
        orderName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return failure(
        400,
        subscriptionErrorCodes.billingAuthFailed,
        error.message || '결제 승인에 실패했습니다',
        error,
      );
    }

    const data = await response.json();
    return success(data);
  } catch (error: any) {
    return failure(
      500,
      subscriptionErrorCodes.billingAuthFailed,
      '결제 승인 중 오류가 발생했습니다',
      error,
    );
  }
};

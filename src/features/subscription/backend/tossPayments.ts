/**
 * 토스 페이먼츠 빌링키 결제 API 클라이언트
 *
 * 토스 페이먼츠 API를 호출하여 정기결제를 수행합니다.
 */

import { failure, success, type HandlerResult } from '@/backend/http/response';
import { fetchWrapper } from '@/backend/http/fetch-wrapper';

const TOSS_API_BASE = 'https://api.tosspayments.com';

export type TossPaymentResult = {
  paymentKey: string;
  orderId: string;
  status: string;
  approvedAt: string;
};

export type TossPaymentError = {
  code: string;
  message: string;
};

/**
 * 빌링키를 이용한 정기결제 승인
 *
 * @param billingKey - 토스 빌링키
 * @param customerKey - 토스 customerKey
 * @param amount - 결제 금액 (원)
 * @param orderId - 주문 번호 (고유값)
 * @param orderName - 주문명
 * @returns 결제 성공 시 paymentKey 포함 결과, 실패 시 에러 결과
 */
export const chargeBillingKey = async (
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  orderName: string,
): Promise<HandlerResult<TossPaymentResult, string, TossPaymentError>> => {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return failure(
      500,
      'TOSS_CONFIG_ERROR',
      'TOSS_SECRET_KEY가 설정되지 않았습니다',
    );
  }

  const auth = Buffer.from(`${secretKey}:`).toString('base64');

  try {
    const response = await fetchWrapper(`${TOSS_API_BASE}/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        amount,
        orderId,
        orderName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as TossPaymentError;
      return failure(
        response.status as any,
        error.code || 'TOSS_PAYMENT_FAILED',
        error.message || '토스 페이먼츠 결제 실패',
        error,
      );
    }

    return success(data as TossPaymentResult);
  } catch (error: any) {
    return failure(
      500,
      'TOSS_NETWORK_ERROR',
      `토스 페이먼츠 API 호출 실패: ${error.message}`,
      error,
    );
  }
};

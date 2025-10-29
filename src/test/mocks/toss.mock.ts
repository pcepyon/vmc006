/**
 * Toss Payments API Mock 응답
 *
 * 테스트 환경에서 사용할 Toss Payments API의 성공/실패 케이스 Mock 데이터입니다.
 */

/**
 * 빌링키 발급 성공 응답
 */
export const MOCK_TOSS_BILLING_KEY_SUCCESS = {
  billingKey: 'mock_billing_key_12345',
  card: {
    company: '신한카드',
    number: '1234-****-****-5678',
  },
}

/**
 * 빌링키 결제 성공 응답
 */
export const MOCK_TOSS_CHARGE_SUCCESS = {
  paymentKey: 'mock_payment_key_67890',
  orderId: 'mock_order_123',
  status: 'DONE',
  approvedAt: '2025-01-15T10:00:00+09:00',
  method: 'BILLING',
  totalAmount: 9900,
  balanceAmount: 9900,
  suppliedAmount: 9000,
  vat: 900,
}

/**
 * 빌링키 발급 실패 응답
 */
export const MOCK_TOSS_BILLING_KEY_ERROR = {
  code: 'INVALID_AUTH_KEY',
  message: '유효하지 않은 인증키입니다',
}

/**
 * 결제 실패 응답
 */
export const MOCK_TOSS_CHARGE_ERROR = {
  code: 'PAYMENT_FAILED',
  message: '결제에 실패했습니다',
}

/**
 * Toss API Mock Fetch 함수 - 빌링키 발급 성공
 */
export function createMockFetchForBillingKeySuccess() {
  return async (url: string, options?: RequestInit) => {
    if (url.includes('/v1/billing/authorizations/issue')) {
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_TOSS_BILLING_KEY_SUCCESS,
      } as Response
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    } as Response
  }
}

/**
 * Toss API Mock Fetch 함수 - 빌링키 발급 실패
 */
export function createMockFetchForBillingKeyFailure() {
  return async (url: string, options?: RequestInit) => {
    if (url.includes('/v1/billing/authorizations/issue')) {
      return {
        ok: false,
        status: 400,
        json: async () => MOCK_TOSS_BILLING_KEY_ERROR,
      } as Response
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    } as Response
  }
}

/**
 * Toss API Mock Fetch 함수 - 결제 성공
 */
export function createMockFetchForChargeSuccess() {
  return async (url: string, options?: RequestInit) => {
    if (url.includes('/v1/billing/')) {
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_TOSS_CHARGE_SUCCESS,
      } as Response
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    } as Response
  }
}

/**
 * Toss API Mock Fetch 함수 - 결제 실패
 */
export function createMockFetchForChargeFailure() {
  return async (url: string, options?: RequestInit) => {
    if (url.includes('/v1/billing/')) {
      return {
        ok: false,
        status: 400,
        json: async () => MOCK_TOSS_CHARGE_ERROR,
      } as Response
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    } as Response
  }
}

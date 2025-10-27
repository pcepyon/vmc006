/**
 * Cron 작업 관련 에러 코드 정의
 */

export const cronErrorCodes = {
  // 인증 에러
  unauthorized: 'CRON_UNAUTHORIZED',

  // 중복 실행 에러
  alreadyProcessed: 'CRON_ALREADY_PROCESSED',

  // 실행 에러
  executionFailed: 'CRON_EXECUTION_FAILED',

  // 정기결제 에러
  billingFetchError: 'BILLING_FETCH_ERROR',
  billingUpdateError: 'BILLING_UPDATE_ERROR',
  billingPaymentFailed: 'BILLING_PAYMENT_FAILED',

  // 구독 만료 처리 에러
  expireFetchError: 'EXPIRE_FETCH_ERROR',
  expireUpdateError: 'EXPIRE_UPDATE_ERROR',

  // 로그 생성 에러
  logCreationError: 'LOG_CREATION_ERROR',
} as const;

type CronErrorValue = (typeof cronErrorCodes)[keyof typeof cronErrorCodes];

export type CronServiceError = CronErrorValue;

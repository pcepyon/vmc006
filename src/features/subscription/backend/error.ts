export const subscriptionErrorCodes = {
  // 구독 조회 에러
  fetchError: 'SUBSCRIPTION_FETCH_ERROR',
  notFound: 'SUBSCRIPTION_NOT_FOUND',

  // 업그레이드 에러
  alreadySubscribed: 'ALREADY_SUBSCRIBED',
  billingAuthFailed: 'BILLING_AUTH_FAILED',
  billingKeyIssueFailed: 'BILLING_KEY_ISSUE_FAILED',
  duplicateRequest: 'DUPLICATE_REQUEST',

  // 취소 에러
  noActiveSubscription: 'NO_ACTIVE_SUBSCRIPTION',
  alreadyCancelled: 'ALREADY_CANCELLED',

  // 재활성화 에러
  billingKeyDeleted: 'BILLING_KEY_DELETED',
  subscriptionExpired: 'SUBSCRIPTION_EXPIRED',

  // 검증 에러
  validationError: 'VALIDATION_ERROR',

  // DB 에러
  databaseError: 'DATABASE_ERROR',
} as const;

export type SubscriptionErrorCode =
  (typeof subscriptionErrorCodes)[keyof typeof subscriptionErrorCodes];

export type SubscriptionServiceError = SubscriptionErrorCode;

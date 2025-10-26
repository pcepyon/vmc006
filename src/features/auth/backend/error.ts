export const authErrorCodes = {
  notFound: 'USER_NOT_FOUND',
  fetchError: 'USER_FETCH_ERROR',
  createError: 'USER_CREATE_ERROR',
  updateError: 'USER_UPDATE_ERROR',
  deleteError: 'USER_DELETE_ERROR',
  validationError: 'USER_VALIDATION_ERROR',
  webhookVerificationFailed: 'WEBHOOK_VERIFICATION_FAILED',
  unauthorized: 'UNAUTHORIZED',
} as const;

type AuthErrorValue = (typeof authErrorCodes)[keyof typeof authErrorCodes];

export type AuthServiceError = AuthErrorValue;

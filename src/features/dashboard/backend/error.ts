export const dashboardErrorCodes = {
  testNotFound: 'TEST_NOT_FOUND',
  testFetchError: 'TEST_FETCH_ERROR',
  unauthorizedAccess: 'UNAUTHORIZED_TEST_ACCESS',
  validationError: 'DASHBOARD_VALIDATION_ERROR',
  userNotFound: 'USER_NOT_FOUND',
  databaseError: 'DASHBOARD_DATABASE_ERROR',
} as const;

export type DashboardServiceError =
  (typeof dashboardErrorCodes)[keyof typeof dashboardErrorCodes];

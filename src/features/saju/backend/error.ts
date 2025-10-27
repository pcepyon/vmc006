/**
 * 사주 검사 관련 에러 코드
 */
export const sajuErrorCodes = {
  // 횟수 관련 에러
  noTestsRemaining: 'NO_TESTS_REMAINING',

  // AI 서비스 에러
  aiServiceError: 'AI_SERVICE_ERROR',
  aiTimeout: 'AI_TIMEOUT',
  aiRateLimit: 'AI_RATE_LIMIT',

  // 검증 에러
  validationError: 'VALIDATION_ERROR',

  // 조회 에러
  notFound: 'NOT_FOUND',
  forbidden: 'FORBIDDEN',

  // 데이터베이스 에러
  fetchError: 'FETCH_ERROR',
  insertError: 'INSERT_ERROR',
  updateError: 'UPDATE_ERROR',
} as const

export type SajuServiceError = (typeof sajuErrorCodes)[keyof typeof sajuErrorCodes]

/**
 * 사주 검사 에러 메시지 매핑
 */
export const sajuErrorMessages: Record<SajuServiceError, string> = {
  [sajuErrorCodes.noTestsRemaining]: '잔여 검사 횟수가 없습니다',
  [sajuErrorCodes.aiServiceError]: 'AI 분석 중 오류가 발생했습니다',
  [sajuErrorCodes.aiTimeout]: 'AI 분석 시간이 초과되었습니다',
  [sajuErrorCodes.aiRateLimit]: 'AI 서비스 요청 제한에 도달했습니다. 잠시 후 다시 시도해주세요',
  [sajuErrorCodes.validationError]: '입력 데이터가 올바르지 않습니다',
  [sajuErrorCodes.notFound]: '검사 결과를 찾을 수 없습니다',
  [sajuErrorCodes.forbidden]: '접근 권한이 없습니다',
  [sajuErrorCodes.fetchError]: '데이터 조회 중 오류가 발생했습니다',
  [sajuErrorCodes.insertError]: '데이터 생성 중 오류가 발생했습니다',
  [sajuErrorCodes.updateError]: '데이터 업데이트 중 오류가 발생했습니다',
}

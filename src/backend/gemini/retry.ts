/**
 * 지수 백오프(Exponential Backoff)를 사용한 재시도 함수
 * Rate Limit 에러 시 자동으로 재시도
 *
 * @param fn - 실행할 비동기 함수
 * @param maxRetries - 최대 재시도 횟수 (기본: 3)
 * @param initialDelayMs - 초기 지연 시간 (기본: 1000ms)
 * @returns 함수 실행 결과
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Rate Limit 에러만 재시도
      if (error.status === 429 && attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt)
        console.log(`[Gemini Retry] Rate limit exceeded, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // 그 외 에러는 즉시 throw
      throw error
    }
  }

  throw lastError
}

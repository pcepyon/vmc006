/**
 * Fetch Wrapper for Testing
 *
 * 테스트 환경에서는 Mock fetch를 사용할 수 있도록 래핑합니다.
 */

type FetchFunction = typeof fetch

let mockFetchFn: FetchFunction | null = null

/**
 * 테스트 환경에서 Mock fetch 함수를 설정합니다.
 */
export function setMockFetch(fn: FetchFunction) {
  mockFetchFn = fn
}

/**
 * Mock fetch를 초기화합니다.
 */
export function resetMockFetch() {
  mockFetchFn = null
}

/**
 * fetch 호출 래퍼
 *
 * 테스트 환경에서 mockFetchFn이 설정되어 있으면 Mock을 사용하고,
 * 그렇지 않으면 실제 fetch를 사용합니다.
 */
export async function fetchWrapper(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (mockFetchFn) {
    return mockFetchFn(input, init)
  }
  return fetch(input, init)
}

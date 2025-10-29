/**
 * Gemini API Mock 응답
 *
 * 테스트 환경에서 사용할 Gemini API의 성공/실패 케이스 Mock 데이터입니다.
 */

export const MOCK_GEMINI_SUCCESS_RESPONSE = {
  summary: '목화토금수의 오행이 균형을 이루고 있으며, 대인관계에 강점이 있습니다. 꾸준한 노력으로 재물운이 상승할 것으로 보입니다.',
  full_analysis: `# 사주팔자 분석

## 1. 사주팔자 구성
- 천간: 갑을병정
- 지지: 자축인묘

## 2. 오행 분석
목(木) 2, 화(火) 2, 토(土) 1, 금(金) 2, 수(水) 1로 균형잡힌 오행 구성을 보입니다.

## 3. 성격 및 기질
온화하고 사교적인 성격으로 주변 사람들과 원만한 관계를 유지합니다. 리더십이 있으며 책임감이 강합니다.

## 4. 건강 운세
전반적으로 건강하나 과로를 주의해야 합니다. 충분한 휴식이 필요합니다.

## 5. 재물 운세
꾸준한 노력으로 점진적인 재물 증가가 예상됩니다. 투자보다는 저축이 유리합니다.

## 6. 애정 및 대인 관계
대인관계가 원만하며 좋은 인연을 만날 가능성이 높습니다.

## 7. 직업 및 진로
안정적인 직업이 적합하며, 특히 교육, 상담 분야에서 능력을 발휘할 수 있습니다.

## 8. 주의사항
급한 성격을 조심하고, 계획적인 생활이 필요합니다.
`,
}

export const MOCK_GEMINI_TIMEOUT_ERROR = {
  name: 'AbortError',
  message: 'AbortError',
}

export const MOCK_GEMINI_RATE_LIMIT_ERROR = {
  status: 429,
  message: 'Rate limit exceeded',
}

export const MOCK_GEMINI_GENERIC_ERROR = {
  message: 'Gemini API error',
}

/**
 * Gemini API Mock 클라이언트 생성 함수
 */
export function createMockGeminiClient() {
  return {
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: {
          text: () => JSON.stringify(MOCK_GEMINI_SUCCESS_RESPONSE),
        },
      }),
    }),
  }
}

/**
 * Gemini API Mock - 타임아웃 케이스
 */
export function createMockGeminiClientWithTimeout() {
  return {
    getGenerativeModel: () => ({
      generateContent: async () => {
        await new Promise((resolve) => setTimeout(resolve, 35000))
        throw MOCK_GEMINI_TIMEOUT_ERROR
      },
    }),
  }
}

/**
 * Gemini API Mock - Rate Limit 케이스
 */
export function createMockGeminiClientWithRateLimit() {
  return {
    getGenerativeModel: () => ({
      generateContent: async () => {
        throw MOCK_GEMINI_RATE_LIMIT_ERROR
      },
    }),
  }
}

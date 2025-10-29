import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

/**
 * Gemini 클라이언트 싱글톤 인스턴스 반환
 *
 * 테스트 환경(NODE_ENV=test)에서는 Mock 클라이언트를 반환합니다.
 */
export function getGeminiClient(): GoogleGenerativeAI {
  // 테스트 환경에서는 Mock 클라이언트 반환
  if (process.env.NODE_ENV === 'test') {
    return createMockGeminiClient() as any
  }

  if (!genAI) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables')
    }

    genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  }
  return genAI
}

/**
 * 테스트용 Mock Gemini 클라이언트 생성
 */
function createMockGeminiClient() {
  const mockResponse = {
    summary: '목화토금수의 오행이 균형을 이루고 있으며, 대인관계에 강점이 있습니다. 꾸준한 노력으로 재물운이 상승할 것으로 보입니다.',
    full_analysis: `# 사주팔자 분석

## 1. 사주팔자 구성
- 천간: 갑을병정
- 지지: 자축인묘

## 2. 오행 분석
목(木) 2, 화(火) 2, 토(土) 1, 금(金) 2, 수(水) 1로 균형잡힌 오행 구성을 보입니다.

## 3. 성격 및 기질
온화하고 사교적인 성격으로 주변 사람들과 원만한 관계를 유지합니다.

## 4. 건강 운세
전반적으로 건강하나 과로를 주의해야 합니다.

## 5. 재물 운세
꾸준한 노력으로 점진적인 재물 증가가 예상됩니다.

## 6. 애정 및 대인 관계
대인관계가 원만하며 좋은 인연을 만날 가능성이 높습니다.

## 7. 직업 및 진로
안정적인 직업이 적합합니다.

## 8. 주의사항
급한 성격을 조심하고, 계획적인 생활이 필요합니다.`,
  }

  return {
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: {
          text: () => JSON.stringify(mockResponse),
        },
      }),
    }),
  }
}

/**
 * 구독 티어에 따라 사용할 모델 선택
 * - free: gemini-2.5-flash-lite (빠른 응답, 효율적인 비용)
 * - pro: gemini-2.5-pro (최고급 분석, 향상된 기능)
 */
export function getModelByTier(tier: 'free' | 'pro'): string {
  return tier === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash-lite'
}

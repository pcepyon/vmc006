import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

/**
 * Gemini 클라이언트 싱글톤 인스턴스 반환
 */
export function getGeminiClient(): GoogleGenerativeAI {
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
 * 구독 티어에 따라 사용할 모델 선택
 * - free: gemini-1.5-flash-latest (빠른 응답, 낮은 비용)
 * - pro: gemini-1.5-pro-latest (고품질 분석, 긴 컨텍스트)
 */
export function getModelByTier(tier: 'free' | 'pro'): string {
  return tier === 'pro' ? 'gemini-1.5-pro-latest' : 'gemini-1.5-flash-latest'
}

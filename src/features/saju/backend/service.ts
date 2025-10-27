import type { SupabaseClient } from '@supabase/supabase-js'
import { getGeminiClient, getModelByTier } from '@/backend/gemini/client'
import { retryWithBackoff } from '@/backend/gemini/retry'
import { success, failure, type HandlerResult } from '@/backend/http/response'
import { sajuErrorCodes, sajuErrorMessages, type SajuServiceError } from './error'
import type {
  AnalyzeSajuRequest,
  SajuTestResponse,
  GetSajuTestListQuery,
  SajuTestListResponse,
} from './schema'

const SAJU_TESTS_TABLE = 'saju_tests'
const AI_TIMEOUT_MS = 30000

/**
 * 사주 분석 프롬프트 생성
 */
function buildSajuPrompt(data: AnalyzeSajuRequest): string {
  const genderText = data.gender === 'male' ? '남성' : '여성'
  const birthTimeText = data.is_birth_time_unknown
    ? '출생시간을 알 수 없음'
    : data.birth_time
      ? `출생시간: ${data.birth_time}`
      : '출생시간 정보 없음'

  return `
당신은 전문 사주 명리학자입니다. 다음 정보를 바탕으로 상세한 사주 분석을 해주세요.

[개인 정보]
- 이름: ${data.test_name}
- 생년월일: ${data.birth_date}
- ${birthTimeText}
- 성별: ${genderText}

[요청 사항]
1. 사주팔자 구성 (천간, 지지)
2. 오행 분석 (목, 화, 토, 금, 수)
3. 성격 및 기질 분석
4. 건강 운세
5. 재물 운세
6. 애정 및 대인 관계 운세
7. 직업 및 진로 조언
8. 주의해야 할 점

[응답 형식]
다음 JSON 형식으로 응답해주세요:
{
  "summary": "200자 이내의 핵심 요약",
  "full_analysis": "상세 분석 내용 (마크다운 형식)"
}
  `.trim()
}

/**
 * 사주 검사 분석 수행
 */
export async function analyzeSaju(
  supabase: SupabaseClient,
  userId: string,
  data: AnalyzeSajuRequest
): Promise<HandlerResult<{ testId: string; summary: string }, SajuServiceError, unknown>> {
  // 1. 사용자 구독 정보 조회
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('subscription_tier, remaining_tests')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return failure(500, sajuErrorCodes.fetchError, sajuErrorMessages[sajuErrorCodes.fetchError])
  }

  // 2. 잔여 횟수 확인
  if (user.remaining_tests <= 0) {
    return failure(403, sajuErrorCodes.noTestsRemaining, sajuErrorMessages[sajuErrorCodes.noTestsRemaining])
  }

  // 3. 모델 선택
  const modelName = getModelByTier(user.subscription_tier as 'free' | 'pro')

  // 4. 검사 레코드 생성
  const { data: testRecord, error: insertError } = await supabase
    .from(SAJU_TESTS_TABLE)
    .insert({
      user_id: userId,
      test_name: data.test_name,
      birth_date: data.birth_date,
      birth_time: data.birth_time || null,
      is_birth_time_unknown: data.is_birth_time_unknown,
      gender: data.gender,
      model_used: modelName,
      status: 'processing',
    })
    .select()
    .single()

  if (insertError || !testRecord) {
    console.error('[Saju Service] Insert error:', insertError)
    return failure(500, sajuErrorCodes.insertError, sajuErrorMessages[sajuErrorCodes.insertError])
  }

  // 5. 횟수 즉시 차감 (롤백 방지)
  const { error: updateUserError } = await supabase
    .from('users')
    .update({ remaining_tests: user.remaining_tests - 1 })
    .eq('id', userId)

  if (updateUserError) {
    console.error('[Saju Service] Update user error:', updateUserError)
    return failure(500, sajuErrorCodes.updateError, sajuErrorMessages[sajuErrorCodes.updateError])
  }

  try {
    // 6. Gemini API 호출 (타임아웃 + 재시도)
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: modelName })
    const prompt = buildSajuPrompt(data)

    // AbortController로 타임아웃 처리
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

    const result = await retryWithBackoff(
      async () => {
        if (controller.signal.aborted) {
          throw new Error('AbortError')
        }
        return model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        })
      },
      3,
      1000
    )

    clearTimeout(timeoutId)

    const text = result.response.text()

    // 7. JSON 파싱
    let summary = ''
    let fullResult = text

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        summary = parsed.summary || ''
        fullResult = parsed.full_analysis || text
      }
    } catch {
      // JSON 파싱 실패 시 전체 텍스트 사용
      summary = text.substring(0, 200)
      fullResult = text
    }

    // 8. 결과 저장
    await supabase
      .from(SAJU_TESTS_TABLE)
      .update({
        status: 'completed',
        summary_result: summary,
        full_result: fullResult,
        completed_at: new Date().toISOString(),
      })
      .eq('id', testRecord.id)

    return success({ testId: testRecord.id, summary })
  } catch (error: any) {
    // 9. 에러 처리
    console.error('[Saju Service] AI analysis error:', error)

    const isTimeout = error.message === 'AbortError' || error.name === 'AbortError'
    const isRateLimit = error.status === 429

    let errorCode: SajuServiceError

    if (isTimeout) {
      errorCode = sajuErrorCodes.aiTimeout
    } else if (isRateLimit) {
      errorCode = sajuErrorCodes.aiRateLimit
    } else {
      errorCode = sajuErrorCodes.aiServiceError
    }

    const errorMessage = sajuErrorMessages[errorCode]

    // 실패 상태 저장
    await supabase
      .from(SAJU_TESTS_TABLE)
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', testRecord.id)

    // 타임아웃이 아닌 경우에만 횟수 복구
    if (!isTimeout) {
      await supabase
        .from('users')
        .update({ remaining_tests: user.remaining_tests })
        .eq('id', userId)
    }

    return failure(500, errorCode, errorMessage, { testId: testRecord.id })
  }
}

/**
 * 검사 결과 조회
 */
export async function getSajuTest(
  supabase: SupabaseClient,
  userId: string,
  testId: string
): Promise<HandlerResult<SajuTestResponse, SajuServiceError, unknown>> {
  const { data, error } = await supabase
    .from(SAJU_TESTS_TABLE)
    .select('*')
    .eq('id', testId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    if (error?.code === 'PGRST116') {
      return failure(404, sajuErrorCodes.notFound, sajuErrorMessages[sajuErrorCodes.notFound])
    }
    return failure(403, sajuErrorCodes.forbidden, sajuErrorMessages[sajuErrorCodes.forbidden])
  }

  return success(data as SajuTestResponse)
}

/**
 * 검사 이력 목록 조회
 */
export async function getSajuTestList(
  supabase: SupabaseClient,
  userId: string,
  options: GetSajuTestListQuery
): Promise<HandlerResult<SajuTestListResponse, SajuServiceError, unknown>> {
  const { page, limit, search } = options
  const offset = (page - 1) * limit

  let query = supabase
    .from(SAJU_TESTS_TABLE)
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // 검색 조건 추가
  if (search && search.trim()) {
    query = query.ilike('test_name', `%${search}%`)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('[Saju Service] List fetch error:', error)
    return failure(500, sajuErrorCodes.fetchError, sajuErrorMessages[sajuErrorCodes.fetchError])
  }

  return success({
    tests: (data as SajuTestResponse[]) || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}

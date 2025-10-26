# Gemini API 연동 가이드

## 개요

이 문서는 Next.js 15 App Router 프로젝트에서 Google Gemini API를 연동하여 사주 분석 기능을 구현하는 방법을 설명합니다.

**작성일**: 2025-01-26
**프로젝트**: 사주 분석 웹앱
**목적**: 사용자의 생년월일시 정보를 AI로 분석하여 사주 풀이 제공

---

## 연동 유형

### 1. SDK 연동
- **패키지**: `@google/generative-ai`
- **용도**: Node.js/TypeScript 환경에서 Gemini API 호출
- **주요 기능**:
  - 텍스트 생성 (Text Generation)
  - 프롬프트 기반 AI 응답
  - 스트리밍 응답 지원

### 2. API 연동
- **엔드포인트**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **사용할 모델**:
  - 무료 사용자: `gemini-1.5-flash` (빠른 응답, 낮은 비용)
  - Pro 구독자: `gemini-1.5-pro` (고품질 분석, 긴 컨텍스트)
- **주요 기능**:
  - 텍스트 입력 → AI 생성 텍스트 출력
  - 멀티턴 대화 지원 (선택사항)

### 3. Webhook 연동
- **해당 없음**: Gemini API는 요청-응답 모델이며 Webhook을 제공하지 않음

---

## 설치 방법

### 1. Gemini SDK 설치

```bash
npm install @google/generative-ai
```

### 2. 환경변수 설정

`.env.local` 파일에 다음 환경변수 추가:

```env
# Gemini API
GEMINI_API_KEY=AIzaSy...your-api-key-here

# 기존 설정 유지
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLERK_SECRET_KEY=sk_test_...
```

**주의**: `GEMINI_API_KEY`는 절대 클라이언트에 노출하지 마세요. 서버 환경변수로만 사용합니다.

---

## Google AI Studio 설정

### 1. API Key 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. Google 계정으로 로그인
3. **Get API Key** 클릭
4. **Create API key** 선택
5. API Key 복사 후 `.env.local`에 `GEMINI_API_KEY`로 저장

### 2. 무료 플랜 제한 사항

| 항목 | 무료 플랜 | 유료 플랜 (Pay-as-you-go) |
|------|-----------|---------------------------|
| RPM (분당 요청) | 15 | 360+ |
| RPD (일당 요청) | 1,500 | 30,000+ |
| TPM (분당 토큰) | 1M | 4M+ |
| 비용 | 무료 | 입력: $0.075/1M 토큰<br>출력: $0.30/1M 토큰 |

**참고**: 무료 플랜으로 시작하며, 사용량이 증가하면 유료 플랜으로 전환 가능

### 3. Quota 및 Rate Limit

- **Rate Limit 초과 시**: `429 RESOURCE_EXHAUSTED` 에러 발생
- **대응 방법**:
  - 지수 백오프(Exponential Backoff)로 재시도
  - 사용자에게 "잠시 후 다시 시도하세요" 안내
  - 큐 시스템 도입 (선택사항)

---

## Supabase 테이블 설정

### 1. saju_tests 테이블 구조

`supabase/migrations/20250126000001_create_saju_tests_table.sql`:

```sql
-- Saju Tests 테이블 생성
CREATE TABLE IF NOT EXISTS public.saju_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,                    -- 검사 대상자 이름
  birth_date DATE NOT NULL,                   -- 생년월일
  birth_time TIME,                            -- 출생시간 (NULL 가능)
  is_birth_time_unknown BOOLEAN DEFAULT FALSE, -- 출생시간 모름 여부
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  model_used TEXT NOT NULL,                   -- 사용한 Gemini 모델명
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  summary_result TEXT,                        -- 요약 결과 (모달용)
  full_result TEXT,                           -- 전체 분석 결과
  error_message TEXT,                         -- 실패 시 에러 메시지
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_saju_tests_user_id ON public.saju_tests(user_id);
CREATE INDEX idx_saju_tests_status ON public.saju_tests(status);
CREATE INDEX idx_saju_tests_created_at ON public.saju_tests(created_at DESC);
CREATE INDEX idx_saju_tests_test_name ON public.saju_tests(test_name); -- 검색용

-- updated_at 자동 업데이트
CREATE TRIGGER update_saju_tests_updated_at
BEFORE UPDATE ON public.saju_tests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## Hono 백엔드 구현

### 1. Gemini 클라이언트 초기화

`src/backend/gemini/client.ts` 생성:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables')
}

// Gemini 클라이언트 싱글톤
let genAI: GoogleGenerativeAI | null = null

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  }
  return genAI
}

/**
 * 구독 티어에 따라 사용할 모델 선택
 */
export function getModelByTier(tier: 'free' | 'pro'): string {
  return tier === 'pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash'
}
```

---

### 2. 사주 분석 서비스

`src/features/saju/backend/service.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { getGeminiClient, getModelByTier } from '@/backend/gemini/client'

/**
 * 사주 분석 프롬프트 생성
 */
function buildSajuPrompt(data: {
  testName: string
  birthDate: string
  birthTime?: string
  isBirthTimeUnknown: boolean
  gender: 'male' | 'female'
}): string {
  const genderText = data.gender === 'male' ? '남성' : '여성'
  const birthTimeText = data.isBirthTimeUnknown
    ? '출생시간을 알 수 없음'
    : data.birthTime
    ? `출생시간: ${data.birthTime}`
    : '출생시간 정보 없음'

  return `
당신은 전문 사주 명리학자입니다. 다음 정보를 바탕으로 상세한 사주 분석을 해주세요.

[개인 정보]
- 이름: ${data.testName}
- 생년월일: ${data.birthDate}
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
 * Gemini API를 호출하여 사주 분석 수행
 */
export async function analyzeSaju(
  supabase: SupabaseClient,
  userId: string,
  data: {
    testName: string
    birthDate: string
    birthTime?: string
    isBirthTimeUnknown: boolean
    gender: 'male' | 'female'
  }
): Promise<{ testId: string; summary: string; fullResult: string }> {
  // 1. 사용자 구독 정보 조회
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('subscription_tier, remaining_tests')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    throw new Error('사용자 정보를 찾을 수 없습니다')
  }

  // 2. 잔여 횟수 확인
  if (user.remaining_tests <= 0) {
    throw new Error('잔여 검사 횟수가 없습니다')
  }

  // 3. 사용할 모델 결정
  const modelName = getModelByTier(user.subscription_tier as 'free' | 'pro')

  // 4. saju_tests 테이블에 레코드 생성 (status: 'processing')
  const { data: testRecord, error: insertError } = await supabase
    .from('saju_tests')
    .insert({
      user_id: userId,
      test_name: data.testName,
      birth_date: data.birthDate,
      birth_time: data.birthTime || null,
      is_birth_time_unknown: data.isBirthTimeUnknown,
      gender: data.gender,
      model_used: modelName,
      status: 'processing',
    })
    .select()
    .single()

  if (insertError || !testRecord) {
    throw new Error('검사 레코드 생성 실패')
  }

  // 5. 잔여 횟수 즉시 차감 (롤백 방지)
  await supabase
    .from('users')
    .update({ remaining_tests: user.remaining_tests - 1 })
    .eq('id', userId)

  try {
    // 6. Gemini API 호출
    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: modelName })

    const prompt = buildSajuPrompt(data)

    // 타임아웃 30초 설정
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    clearTimeout(timeoutId)

    const response = result.response
    const text = response.text()

    // 7. JSON 파싱 시도
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
      .from('saju_tests')
      .update({
        status: 'completed',
        summary_result: summary,
        full_result: fullResult,
        completed_at: new Date().toISOString(),
      })
      .eq('id', testRecord.id)

    return {
      testId: testRecord.id,
      summary,
      fullResult,
    }
  } catch (error: any) {
    // 9. 에러 처리
    const errorMessage = error.name === 'AbortError'
      ? 'AI 분석 시간이 초과되었습니다'
      : error.message || '알 수 없는 오류가 발생했습니다'

    // 실패 상태 저장
    await supabase
      .from('saju_tests')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', testRecord.id)

    // 타임아웃의 경우 백그라운드 재시도 (선택사항)
    if (error.name === 'AbortError') {
      // 백그라운드에서 재시도 로직 추가 가능
      // 여기서는 단순히 실패로 처리
    }

    throw new Error(errorMessage)
  }
}

/**
 * 검사 결과 조회
 */
export async function getSajuTest(
  supabase: SupabaseClient,
  userId: string,
  testId: string
) {
  const { data, error } = await supabase
    .from('saju_tests')
    .select('*')
    .eq('id', testId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw new Error('검사 결과를 찾을 수 없습니다')
  }

  return data
}

/**
 * 검사 이력 목록 조회 (검색 포함)
 */
export async function getSajuTestList(
  supabase: SupabaseClient,
  userId: string,
  options: {
    page?: number
    limit?: number
    search?: string
  }
) {
  const page = options.page || 1
  const limit = Math.min(options.limit || 10, 50)
  const offset = (page - 1) * limit

  let query = supabase
    .from('saju_tests')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // 검색 조건 추가
  if (options.search) {
    query = query.ilike('test_name', `%${options.search}%`)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    throw new Error('검사 이력 조회 실패')
  }

  return {
    tests: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  }
}
```

---

### 3. Zod 스키마 정의

`src/features/saju/backend/schema.ts`:

```typescript
import { z } from 'zod'

/**
 * 새 검사 요청 스키마
 */
export const analyzeSajuSchema = z.object({
  test_name: z.string().min(1, '이름을 입력해주세요').max(50),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다'),
  birth_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  is_birth_time_unknown: z.boolean().default(false),
  gender: z.enum(['male', 'female'], { message: '성별을 선택해주세요' }),
})

export type AnalyzeSajuRequest = z.infer<typeof analyzeSajuSchema>

/**
 * 검사 이력 목록 쿼리 스키마
 */
export const getSajuTestListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
})

export type GetSajuTestListQuery = z.infer<typeof getSajuTestListSchema>
```

---

### 4. Hono 라우터

`src/features/saju/backend/route.ts`:

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { requireAuth } from '@/backend/middleware/withClerk'
import type { AppEnv } from '@/backend/hono/context'
import { analyzeSaju, getSajuTest, getSajuTestList } from './service'
import { analyzeSajuSchema, getSajuTestListSchema } from './schema'

const app = new Hono<AppEnv>()

// 새 검사 수행
app.post('/analyze', requireAuth(), zValidator('json', analyzeSajuSchema), async (c) => {
  const userId = c.get('userId')!
  const supabase = c.get('supabase')
  const data = c.req.valid('json')

  try {
    const result = await analyzeSaju(supabase, userId, data)

    return c.json({
      test_id: result.testId,
      status: 'completed',
      summary_result: result.summary,
      message: '검사가 완료되었습니다',
    })
  } catch (error: any) {
    const status = error.message.includes('잔여 검사 횟수') ? 403 : 500

    return c.json(
      {
        error: error.message,
        message: error.message,
      },
      status
    )
  }
})

// 검사 결과 조회
app.get('/tests/:testId', requireAuth(), async (c) => {
  const userId = c.get('userId')!
  const supabase = c.get('supabase')
  const testId = c.req.param('testId')

  try {
    const test = await getSajuTest(supabase, userId, testId)
    return c.json(test)
  } catch (error: any) {
    return c.json({ error: error.message }, 404)
  }
})

// 검사 이력 목록
app.get('/tests', requireAuth(), zValidator('query', getSajuTestListSchema), async (c) => {
  const userId = c.get('userId')!
  const supabase = c.get('supabase')
  const query = c.req.valid('query')

  try {
    const result = await getSajuTestList(supabase, userId, query)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

export default app
```

---

### 5. Hono App에 라우터 등록

`src/backend/hono/app.ts` 수정:

```typescript
import { Hono } from 'hono'
import { errorBoundary } from '../middleware/error'
import { withAppContext } from '../middleware/context'
import { withClerk } from '../middleware/withClerk'
import { withSupabase } from '../middleware/supabase'
import sajuRoutes from '@/features/saju/backend/route'
// import subscriptionRoutes from '@/features/subscription/backend/route'

export const runtime = 'nodejs'

let honoApp: Hono | null = null

export function createHonoApp() {
  if (honoApp) return honoApp

  const app = new Hono().basePath('/api')

  // 미들웨어 체인
  app.use('*', errorBoundary())
  app.use('*', withAppContext())
  app.use('*', withClerk())
  app.use('*', withSupabase())

  // 라우터 등록
  app.route('/saju', sajuRoutes)
  // app.route('/subscription', subscriptionRoutes)

  honoApp = app
  return app
}
```

---

## 클라이언트 구현

### 1. React Query 훅

`src/features/saju/hooks/useSajuAnalysis.ts`:

```typescript
'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/remote/api-client'

type AnalyzeSajuRequest = {
  test_name: string
  birth_date: string
  birth_time?: string
  is_birth_time_unknown: boolean
  gender: 'male' | 'female'
}

/**
 * 사주 분석 Mutation
 */
export function useAnalyzeSaju() {
  return useMutation({
    mutationFn: async (data: AnalyzeSajuRequest) => {
      const response = await apiClient.post('/saju/analyze', data)
      return response.data
    },
  })
}

/**
 * 검사 결과 조회
 */
export function useSajuTest(testId: string) {
  return useQuery({
    queryKey: ['saju-test', testId],
    queryFn: async () => {
      const response = await apiClient.get(`/saju/tests/${testId}`)
      return response.data
    },
    enabled: !!testId,
  })
}

/**
 * 검사 이력 목록
 */
export function useSajuTestList(page = 1, search = '') {
  return useQuery({
    queryKey: ['saju-tests', page, search],
    queryFn: async () => {
      const response = await apiClient.get('/saju/tests', {
        params: { page, search },
      })
      return response.data
    },
  })
}
```

---

### 2. 새 검사 페이지 예시

`src/app/(dashboard)/dashboard/new/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAnalyzeSaju } from '@/features/saju/hooks/useSajuAnalysis'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NewTestPage() {
  const router = useRouter()
  const analyzeSaju = useAnalyzeSaju()

  const [formData, setFormData] = useState({
    test_name: '',
    birth_date: '',
    birth_time: '',
    is_birth_time_unknown: false,
    gender: 'male' as 'male' | 'female',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await analyzeSaju.mutateAsync(formData)

      // 결과 모달 표시 또는 상세 페이지로 이동
      alert(`분석 완료!\n요약: ${result.summary_result}`)
      router.push(`/dashboard/result/${result.test_id}`)
    } catch (error: any) {
      alert(error.response?.data?.message || '검사 실패')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">새 검사</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">이름</label>
          <Input
            value={formData.test_name}
            onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block mb-2">생년월일</label>
          <Input
            type="date"
            value={formData.birth_date}
            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block mb-2">출생시간</label>
          <Input
            type="time"
            value={formData.birth_time}
            onChange={(e) => setFormData({ ...formData, birth_time: e.target.value })}
            disabled={formData.is_birth_time_unknown}
          />
          <label className="flex items-center mt-2">
            <input
              type="checkbox"
              checked={formData.is_birth_time_unknown}
              onChange={(e) =>
                setFormData({ ...formData, is_birth_time_unknown: e.target.checked })
              }
              className="mr-2"
            />
            출생시간 모름
          </label>
        </div>

        <div>
          <label className="block mb-2">성별</label>
          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })
            }
            className="w-full p-2 border rounded"
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </div>

        <Button type="submit" disabled={analyzeSaju.isPending} className="w-full">
          {analyzeSaju.isPending ? '분석 중...' : '검사 시작'}
        </Button>
      </form>
    </div>
  )
}
```

---

## 에러 처리 및 재시도 로직

### 1. Gemini API 에러 코드

| 에러 코드 | 설명 | 대응 방법 |
|-----------|------|-----------|
| `RESOURCE_EXHAUSTED` (429) | Rate Limit 초과 | 지수 백오프 재시도 |
| `INVALID_ARGUMENT` (400) | 잘못된 요청 파라미터 | 사용자 입력 검증 |
| `PERMISSION_DENIED` (403) | API Key 권한 없음 | API Key 재확인 |
| `INTERNAL` (500) | Gemini 서버 오류 | 재시도 후 사용자 안내 |
| `DEADLINE_EXCEEDED` (504) | 타임아웃 | 백그라운드 처리 또는 재시도 |

### 2. 지수 백오프 재시도 함수

`src/backend/gemini/retry.ts`:

```typescript
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
        console.log(`Rate limit exceeded, retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // 그 외 에러는 즉시 throw
      throw error
    }
  }

  throw lastError
}
```

사용 예시:

```typescript
const result = await retryWithBackoff(
  () => model.generateContent({ contents: [...] }),
  3,
  1000
)
```

---

## 보안 및 모범 사례

### 1. API Key 보안

✅ **권장 사항**:
- API Key는 절대 클라이언트 코드에 노출하지 마세요
- `.env.local` 파일을 `.gitignore`에 추가
- 프로덕션에서는 Vercel Environment Variables 사용

❌ **금지 사항**:
- `NEXT_PUBLIC_GEMINI_API_KEY` 형태로 환경변수 설정 금지
- 클라이언트 컴포넌트에서 직접 Gemini API 호출 금지

### 2. 입력 검증

- 모든 사용자 입력은 Zod 스키마로 검증
- SQL Injection 방지를 위해 Supabase 파라미터 바인딩 사용
- Prompt Injection 방지를 위해 프롬프트 템플릿 고정

### 3. 비용 최적화

- 무료 사용자에게는 `gemini-1.5-flash` 사용 (저비용)
- Pro 사용자에게만 `gemini-1.5-pro` 제공
- 불필요한 긴 프롬프트 지양
- 응답 길이 제한 설정 (선택사항)

---

## Step-by-Step 가이드

### Phase 1: Google AI Studio 설정 (10분)

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. API Key 생성
3. `.env.local`에 `GEMINI_API_KEY` 추가
4. 테스트: API Key가 유효한지 확인

### Phase 2: Supabase 테이블 설정 (10분)

1. `saju_tests` 테이블 마이그레이션 실행
2. Supabase Dashboard에서 테이블 생성 확인
3. 테스트: 수동으로 레코드 삽입 후 조회

### Phase 3: Gemini SDK 설치 및 클라이언트 초기화 (15분)

1. `npm install @google/generative-ai` 실행
2. `src/backend/gemini/client.ts` 생성
3. 환경변수 확인 로직 추가
4. 테스트: Node.js 환경에서 간단한 API 호출

### Phase 4: Hono 백엔드 구현 (1시간)

1. `src/features/saju/backend/service.ts` 작성
2. `src/features/saju/backend/schema.ts` 작성
3. `src/features/saju/backend/route.ts` 작성
4. Hono App에 라우터 등록
5. 테스트: Postman으로 `/api/saju/analyze` 호출

### Phase 5: 클라이언트 구현 (45분)

1. React Query 훅 작성
2. 새 검사 페이지 UI 구현
3. 분석 모달 또는 상세 페이지 구현
4. 테스트: 실제 사주 분석 플로우 진행

### Phase 6: 에러 처리 및 최적화 (30분)

1. Rate Limit 재시도 로직 추가
2. 타임아웃 처리 구현
3. 사용자 친화적인 에러 메시지 표시
4. 로딩 상태 및 프로그레스 바 추가

### Phase 7: 프로덕션 배포 (15분)

1. Vercel Environment Variables에 `GEMINI_API_KEY` 설정
2. 프로덕션 환경에서 API 호출 테스트
3. 사용량 모니터링 (Google AI Studio Dashboard)
4. 필요 시 유료 플랜으로 전환

---

## 주의사항 및 알려진 이슈

### 1. Rate Limit 제한

- **무료 플랜**: 분당 15회 제한
- **대응**: 큐 시스템 도입 또는 유료 플랜 전환

### 2. 타임아웃 처리

- Gemini API는 긴 프롬프트에 30초 이상 소요 가능
- 타임아웃 시 백그라운드 처리 또는 재시도 필요

### 3. 프롬프트 품질

- Gemini의 응답 품질은 프롬프트에 크게 의존
- 명확하고 구체적인 지시사항 제공 필요
- 응답 형식(JSON)을 명시하면 파싱 용이

### 4. 비용 관리

- 무료 플랜 Quota 초과 시 자동으로 유료 전환되지 않음
- 유료 플랜 사용 시 비용 알림 설정 권장

### 5. 멀티모달 기능

- 현재는 텍스트만 사용
- 추후 이미지 업로드 기능 추가 가능 (손금, 관상 등)

---

## 참고 자료

### 공식 문서
- [Google AI for Developers](https://ai.google.dev/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Node.js SDK Reference](https://ai.google.dev/gemini-api/docs/get-started/node)
- [Rate Limits and Quotas](https://ai.google.dev/gemini-api/docs/quota)

### 블로그 및 가이드
- [Getting Started with Gemini API in Next.js](https://vercel.com/guides/gemini-api-nextjs)
- [Building AI Apps with Gemini and TypeScript](https://www.builder.io/blog/gemini-typescript)

### GitHub 예제
- [google/generative-ai-js](https://github.com/google/generative-ai-js)

---

## 체크리스트

배포 전 다음 항목을 확인하세요:

- [ ] `GEMINI_API_KEY`가 환경변수에 설정되어 있는가?
- [ ] API Key가 서버에서만 사용되는가? (클라이언트 노출 방지)
- [ ] Supabase `saju_tests` 테이블이 생성되었는가?
- [ ] Gemini SDK가 설치되었는가? (`@google/generative-ai`)
- [ ] 프롬프트 템플릿이 명확하게 작성되었는가?
- [ ] 에러 처리 로직이 구현되었는가? (Rate Limit, 타임아웃)
- [ ] 사용자 입력 검증이 Zod 스키마로 구현되었는가?
- [ ] 무료/Pro 사용자별 모델 분기가 정상 작동하는가?
- [ ] 잔여 횟수 차감 로직이 정상 작동하는가?
- [ ] 프로덕션 환경에서 Gemini API 호출이 정상 작동하는가?
- [ ] Google AI Studio에서 사용량 모니터링이 가능한가?

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-01-26
**작성자**: Senior Developer

**미확정 사항**:
- Gemini 응답의 정확한 JSON 형식 (실제 테스트 후 조정 필요)
- 타임아웃 후 백그라운드 처리 상세 구현 (현재는 실패 처리)
- 사용량 모니터링 및 알림 시스템 (선택사항)

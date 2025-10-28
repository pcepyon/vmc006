# 토스 페이먼츠 연동 가이드

## 개요

이 문서는 Next.js 15 App Router 프로젝트에 토스 페이먼츠 정기결제(빌링키)를 연동하고, Supabase Cron을 이용한 자동 결제를 구현하는 방법을 설명합니다.

**작성일**: 2025-10-28 (API 개별 연동키 방식으로 수정)
**프로젝트**: 사주 분석 웹앱
**목적**: Pro 요금제 구독 결제 구현 (카드 결제만 지원)

---

## 연동 유형

### 1. SDK 연동
- **패키지**: `@tosspayments/payment-sdk` (API 개별 연동)
- **용도**: 빌링키 발급용 결제창 UI 제공
- **주요 기능**:
  - 카드 정보 입력 UI
  - 본인인증 처리
  - 빌링키 발급

### 2. API 연동
- **엔드포인트**: 토스 페이먼츠 REST API
- **용도**: 서버에서 빌링키 발급 및 정기결제 승인
- **주요 API**:
  - `POST /v1/billing/authorizations/card`: 빌링키 발급
  - `POST /v1/billing/{billingKey}`: 정기결제 승인
  - 빌링키 삭제 API는 제공되지 않음 (DB에서 직접 관리)

### 3. Webhook 연동 (선택사항)
- **이벤트**: `PAYMENT_STATUS_CHANGED`, `BILLING_DELETED`
- **용도**: 결제 상태 변경 알림
- **주의**: 정기결제는 서버에서 직접 승인하므로 Webhook은 선택사항

### 4. Supabase Cron 연동
- **패키지**: `pg_cron` + `pg_net` (Supabase 내장)
- **용도**: 매일 02:00에 정기결제 트리거
- **플로우**: Supabase Cron → Hono API → 토스 결제 API

---

## 설치 방법

### 1. 토스 페이먼츠 SDK 설치

```bash
npm install @tosspayments/payment-sdk
```

### 2. 환경변수 설정

```env
# 토스 페이먼츠 API 개별 연동 Keys (결제위젯 키가 아님!)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxx  # API 개별 연동 클라이언트 키
TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx              # API 개별 연동 시크릿 키

# Supabase Cron 검증용 Secret Token
CRON_SECRET_TOKEN=your-random-secret-token-here

# 기존 설정
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Supabase 테이블 설정

### 1. Users 테이블 수정

기존 `users` 테이블에 구독 관련 컬럼 추가:

```sql
-- users 테이블에 구독 정보 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS remaining_tests INTEGER DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);
```

### 2. Subscriptions 테이블 생성

`supabase/migrations/20250126000001_create_subscriptions_table.sql`:

```sql
-- Subscriptions 테이블 생성
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_key TEXT NOT NULL UNIQUE,      -- 토스 customerKey (UUID)
  billing_key TEXT NOT NULL,              -- 토스 빌링키
  card_company TEXT,                      -- 카드사 (예: 신한카드)
  card_number TEXT,                       -- 마스킹된 카드번호 (예: 433012******1234)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  next_billing_date DATE NOT NULL,        -- 다음 결제일
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)                         -- 한 명당 하나의 구독만 가능
);

-- 인덱스 생성
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing_date ON public.subscriptions(next_billing_date);

-- updated_at 자동 업데이트
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 3. Payments 테이블 생성

`supabase/migrations/20250126000002_create_payments_table.sql`:

```sql
-- Payments 테이블 생성 (결제 내역 기록)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_key TEXT,                       -- 토스 결제 키 (정기결제에는 없을 수 있음)
  order_id TEXT NOT NULL UNIQUE,          -- 주문 번호 (가맹점에서 생성)
  amount INTEGER NOT NULL,                -- 결제 금액
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'CANCELLED')),
  method TEXT DEFAULT 'billing',          -- 'billing' (정기결제)
  error_code TEXT,                        -- 실패 시 에러 코드
  error_message TEXT,                     -- 실패 시 에러 메시지
  paid_at TIMESTAMP WITH TIME ZONE,       -- 결제 완료 시각
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_paid_at ON public.payments(paid_at);
```

---

## 토스 페이먼츠 계정 설정

### 1. 토스 페이먼츠 가입

1. [토스 페이먼츠 개발자센터](https://developers.tosspayments.com/) 접속
2. 회원가입 및 로그인
3. **내 개발정보** 메뉴에서 **API 개별 연동 키** 확인:
   - **클라이언트 키** (Client Key): `test_ck_` 또는 `live_ck_`
   - **시크릿 키** (Secret Key): `test_sk_` 또는 `live_sk_`

**중요**: 결제위젯 연동키(`test_gck_`)가 아닌 **API 개별 연동키**(`test_ck_`)를 사용해야 합니다.

### 2. 자동결제(빌링) 계약

**중요**: 자동결제는 추가 계약이 필요합니다.
- 토스 페이먼츠 담당자에게 문의하여 자동결제 계약 체결
- 계약 없이는 빌링키 발급 시 `NOT_SUPPORTED_METHOD` 에러 발생

### 3. 테스트 환경 설정

- 테스트 키(`test_ck_`, `test_sk_`)를 사용하면 실제 결제가 발생하지 않음
- 테스트 환경에서는 카드 번호의 앞 6자리(BIN)만 맞으면 테스트 가능
- 실제 카드 정보를 입력해도 테스트 환경에서는 돈이 출금되지 않음

---

## 빌링키 발급 구현

### 1. 구독 페이지 UI 생성

`src/app/(dashboard)/subscription/page.tsx`:

```typescript
'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SubscriptionPage() {
  const { user } = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async () => {
    setIsLoading(true)

    // customerKey 생성 (UUID)
    const customerKey = crypto.randomUUID()

    // 결제창 리다이렉트 페이지로 이동
    router.push(`/subscription/billing?customerKey=${customerKey}`)
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">구독 관리</h1>

      {/* 현재 구독 정보 표시 */}
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-lg font-semibold mb-2">현재 요금제</h2>
        <p>무료 (Free)</p>
        <p className="text-sm text-gray-600">잔여 검사 횟수: 3회</p>
      </div>

      {/* Pro 요금제 업그레이드 박스 */}
      <div className="p-6 border rounded-lg bg-blue-50">
        <h2 className="text-xl font-bold mb-4">Pro 요금제</h2>
        <ul className="mb-4 space-y-2">
          <li>✓ 월 10회 검사 가능</li>
          <li>✓ Gemini 2.5 Pro 모델 사용</li>
          <li>✓ 더 정확한 사주 분석</li>
        </ul>
        <p className="text-2xl font-bold mb-2">₩9,900 / 월</p>
        <p className="text-xs text-gray-600 mb-4">
          ⚠️ 테스트 모드: 실제 결제가 발생하지 않습니다.
        </p>
        <p className="text-xs text-red-600 mb-4">
          * 구독 후 환불이 불가능합니다.
        </p>
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '처리 중...' : '지금 업그레이드하기'}
        </button>
      </div>
    </div>
  )
}
```

### 2. 빌링키 발급 페이지 생성

`src/app/(dashboard)/subscription/billing/page.tsx`:

```typescript
'use client'

import { loadTossPayments } from '@tosspayments/payment-sdk'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!

export default function BillingPage() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerKey = searchParams.get('customerKey')
  const tossPaymentsRef = useRef<any>(null)

  useEffect(() => {
    if (!customerKey || !user) return

    const initializeTossPayments = async () => {
      const tossPayments = await loadTossPayments(clientKey)
      tossPaymentsRef.current = tossPayments
    }

    initializeTossPayments()
  }, [customerKey, user])

  const handleIssueBillingKey = async () => {
    if (!tossPaymentsRef.current || !customerKey) return

    try {
      const billing = tossPaymentsRef.current.billing

      // 빌링키 발급 요청
      await billing.requestBillingAuth({
        method: 'CARD',
        successUrl: `${window.location.origin}/subscription/billing/success?customerKey=${customerKey}`,
        failUrl: `${window.location.origin}/subscription/billing/fail`,
        customerKey: customerKey,
        customerEmail: user?.primaryEmailAddress?.emailAddress,
        customerName: user?.fullName || user?.username,
      })
    } catch (error) {
      console.error('빌링키 발급 오류:', error)
      alert('빌링키 발급에 실패했습니다.')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">카드 등록</h1>
      <p className="mb-4 text-gray-600">
        정기결제를 위한 카드 정보를 등록합니다.
      </p>
      <p className="mb-6 text-sm text-red-600">
        ⚠️ 테스트 모드: 실제 결제가 발생하지 않습니다.
      </p>

      <div className="p-6 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">결제 정보</h2>
        <div className="space-y-2 mb-6">
          <p className="text-sm text-gray-600">고객 이메일: {user?.primaryEmailAddress?.emailAddress}</p>
          <p className="text-sm text-gray-600">고객명: {user?.fullName || user?.username}</p>
        </div>

        <button
          onClick={handleIssueBillingKey}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
        >
          카드 등록하기
        </button>
      </div>
    </div>
  )
}
```

### 3. 빌링키 발급 성공 처리

`src/app/(dashboard)/subscription/billing/success/page.tsx`:

```typescript
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()
  const [isProcessing, setIsProcessing] = useState(true)

  const customerKey = searchParams.get('customerKey')
  const authKey = searchParams.get('authKey')

  useEffect(() => {
    if (!customerKey || !authKey || !user) return

    const confirmBillingKey = async () => {
      try {
        // Hono API로 빌링키 발급 확정 요청
        const response = await fetch('/api/subscription/billing/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerKey,
            authKey,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || '빌링키 발급 실패')
        }

        alert('구독이 완료되었습니다!')
        router.push('/dashboard')
      } catch (error) {
        console.error('빌링키 확정 오류:', error)
        alert('구독 처리 중 오류가 발생했습니다.')
        router.push('/subscription')
      } finally {
        setIsProcessing(false)
      }
    }

    confirmBillingKey()
  }, [customerKey, authKey, user, router])

  return (
    <div className="container mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">구독 처리 중...</h1>
      {isProcessing && <p>잠시만 기다려주세요.</p>}
    </div>
  )
}
```

---

## Hono 백엔드 API 구현

### 1. 빌링키 발급 확정 API

`src/features/subscription/backend/route.ts`:

```typescript
import { Hono } from 'hono'
import { requireAuth } from '@/backend/middleware/withClerk'
import type { AppEnv } from '@/backend/hono/context'
import { issueBillingKey, createSubscription } from './service'

const app = new Hono<AppEnv>()

// 빌링키 발급 확정
app.post('/billing/confirm', requireAuth(), async (c) => {
  const userId = c.get('userId')!
  const supabase = c.get('supabase')
  const { customerKey, authKey } = await c.req.json()

  try {
    // 토스 페이먼츠 빌링키 발급 API 호출
    const billingData = await issueBillingKey(authKey, customerKey)

    // Supabase에 구독 정보 저장
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    await createSubscription(supabase, {
      userId,
      customerKey,
      billingKey: billingData.billingKey,
      cardCompany: billingData.card.company,
      cardNumber: billingData.card.number,
      nextBillingDate: nextBillingDate.toISOString().split('T')[0],
    })

    // users 테이블 업데이트 (Pro 요금제, 잔여 횟수 10회)
    await supabase
      .from('users')
      .update({
        subscription_tier: 'pro',
        remaining_tests: 10,
      })
      .eq('id', userId)

    return c.json({ message: '구독이 완료되었습니다.' })
  } catch (error: any) {
    console.error('빌링키 발급 오류:', error)
    return c.json({ error: error.message }, 500)
  }
})

export default app
```

### 2. 빌링키 발급 서비스

`src/features/subscription/backend/service.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!
const TOSS_API_BASE = 'https://api.tosspayments.com'

/**
 * 토스 페이먼츠 빌링키 발급 API 호출
 */
export async function issueBillingKey(authKey: string, customerKey: string) {
  const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')

  const response = await fetch(`${TOSS_API_BASE}/v1/billing/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authKey,
      customerKey,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '빌링키 발급 실패')
  }

  return await response.json()
}

/**
 * Supabase에 구독 정보 저장
 */
export async function createSubscription(
  supabase: SupabaseClient,
  data: {
    userId: string
    customerKey: string
    billingKey: string
    cardCompany: string
    cardNumber: string
    nextBillingDate: string
  }
) {
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: data.userId,
    customer_key: data.customerKey,
    billing_key: data.billingKey,
    card_company: data.cardCompany,
    card_number: data.cardNumber,
    status: 'active',
    next_billing_date: data.nextBillingDate,
  }, { onConflict: 'user_id' })

  if (error) {
    throw new Error(`구독 정보 저장 실패: ${error.message}`)
  }
}

/**
 * 빌링키로 정기결제 승인
 */
export async function chargeBilling(
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  orderName: string
) {
  const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')

  const response = await fetch(`${TOSS_API_BASE}/v1/billing/${billingKey}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey,
      amount,
      orderId,
      orderName,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '결제 승인 실패')
  }

  return await response.json()
}
```

---

## 정기결제 자동 실행 (Supabase Cron)

### 1. Hono 정기결제 API

`src/features/subscription/backend/route.ts`에 추가:

```typescript
// 정기결제 Cron 엔드포인트
app.post('/billing/cron', async (c) => {
  const supabase = c.get('supabase')
  const logger = c.get('logger')

  // Secret Token 검증
  const cronSecret = c.req.header('X-Cron-Secret')
  if (cronSecret !== process.env.CRON_SECRET_TOKEN) {
    logger.error('Invalid cron secret token')
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    // 오늘 결제일인 활성 구독 조회
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*, users!inner(id, email)')
      .eq('status', 'active')
      .eq('next_billing_date', today)

    if (error) throw error

    logger.log(`Found ${subscriptions?.length || 0} subscriptions to charge`)

    const results = []

    for (const sub of subscriptions || []) {
      const orderId = `ORDER-${sub.user_id}-${Date.now()}`

      try {
        // 정기결제 승인 시도
        const payment = await chargeBilling(
          sub.billing_key,
          sub.customer_key,
          9900, // Pro 요금제 가격 (실제 금액으로 변경)
          orderId,
          'Pro 요금제 월 구독'
        )

        // 결제 성공: payments 테이블에 기록
        await supabase.from('payments').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          payment_key: payment.paymentKey,
          order_id: orderId,
          amount: 9900,
          status: 'SUCCESS',
          method: 'billing',
          paid_at: new Date().toISOString(),
        })

        // 구독 기간 연장 + 잔여 횟수 추가
        const nextMonth = new Date(sub.next_billing_date)
        nextMonth.setMonth(nextMonth.getMonth() + 1)

        await supabase
          .from('subscriptions')
          .update({
            next_billing_date: nextMonth.toISOString().split('T')[0],
          })
          .eq('id', sub.id)

        await supabase
          .from('users')
          .update({
            remaining_tests: 10, // 매월 10회로 리셋
          })
          .eq('id', sub.user_id)

        results.push({ userId: sub.user_id, status: 'success' })
      } catch (error: any) {
        logger.error(`Payment failed for user ${sub.user_id}:`, error)

        // 결제 실패: payments 테이블에 실패 기록
        await supabase.from('payments').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          order_id: orderId,
          amount: 9900,
          status: 'FAILED',
          method: 'billing',
          error_code: error.code,
          error_message: error.message,
        })

        // 구독 즉시 해지
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', sub.id)

        await supabase
          .from('users')
          .update({ subscription_tier: 'free', remaining_tests: 0 })
          .eq('id', sub.user_id)

        results.push({ userId: sub.user_id, status: 'failed', error: error.message })
      }
    }

    return c.json({ message: 'Cron job completed', results })
  } catch (error: any) {
    logger.error('Cron job error:', error)
    return c.json({ error: error.message }, 500)
  }
})
```

### 2. Supabase Cron 설정

Supabase Dashboard → Database → Extensions에서 `pg_cron`과 `pg_net` 활성화 후:

```sql
-- 매일 02:00에 정기결제 트리거
SELECT cron.schedule(
  'recurring-payment-trigger',
  '0 2 * * *', -- 매일 02:00 (한국 시간은 UTC+9 고려)
  $$
  SELECT net.http_post(
    url := 'https://your-domain.com/api/subscription/billing/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', 'your-cron-secret-token'
    ),
    body := jsonb_build_object('timestamp', now()),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
```

**주의**: URL을 실제 배포된 도메인으로 변경해야 합니다.

---

## 구독 취소 구현

### 1. 구독 취소 API

`src/features/subscription/backend/route.ts`에 추가:

```typescript
// 구독 취소
app.post('/cancel', requireAuth(), async (c) => {
  const userId = c.get('userId')!
  const supabase = c.get('supabase')

  try {
    // 구독 정보 조회
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !subscription) {
      return c.json({ error: '활성 구독이 없습니다.' }, 404)
    }

    // 구독 상태를 'cancelled'로 변경 (다음 결제일까지 유지)
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscription.id)

    return c.json({ message: '구독이 취소되었습니다. 다음 결제일까지 이용 가능합니다.' })
  } catch (error: any) {
    console.error('구독 취소 오류:', error)
    return c.json({ error: error.message }, 500)
  }
})

// 구독 취소 철회 (재구독)
app.post('/reactivate', requireAuth(), async (c) => {
  const userId = c.get('userId')!
  const supabase = c.get('supabase')

  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'cancelled')
      .single()

    if (!subscription) {
      return c.json({ error: '취소된 구독이 없습니다.' }, 404)
    }

    // 다음 결제일이 지나지 않았으면 재활성화 가능
    const today = new Date().toISOString().split('T')[0]
    if (subscription.next_billing_date < today) {
      return c.json({ error: '구독 기간이 만료되어 재활성화할 수 없습니다.' }, 400)
    }

    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('id', subscription.id)

    return c.json({ message: '구독이 재활성화되었습니다.' })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})
```

### 2. Cron Job에서 만료된 구독 정리

정기결제 Cron에 추가:

```typescript
// 결제일이 지난 cancelled 상태 구독을 expired로 변경
const { data: cancelledSubs } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('status', 'cancelled')
  .lte('next_billing_date', today)

for (const sub of cancelledSubs || []) {
  // 빌링키 삭제 (DB에서만)
  await supabase
    .from('subscriptions')
    .update({ status: 'expired', billing_key: null })
    .eq('id', sub.id)

  // 사용자를 무료 요금제로 전환
  await supabase
    .from('users')
    .update({ subscription_tier: 'free', remaining_tests: 0 })
    .eq('id', sub.user_id)
}
```

---

## Webhook 설정 (선택사항)

### 1. Webhook 엔드포인트 생성

`src/app/api/webhooks/toss/route.ts`:

```typescript
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const headerPayload = await headers()
  const body = await req.json()

  // Secret 검증 (토스 페이먼츠는 secret 필드로 검증)
  // 결제 승인 시 받은 secret과 webhook의 secret이 동일한지 확인

  const eventType = body.eventType

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  switch (eventType) {
    case 'PAYMENT_STATUS_CHANGED':
      if (body.status === 'DONE') {
        console.log('결제 완료:', body.orderId)
      }
      break

    case 'BILLING_DELETED':
      // 빌링키 삭제 이벤트 (토스 측에서 삭제했을 때)
      console.log('빌링키 삭제됨:', body.billingKey)
      break

    default:
      console.log(`Unhandled event type: ${eventType}`)
  }

  return new Response('OK', { status: 200 })
}
```

### 2. 토스 페이먼츠 Dashboard에서 Webhook 설정

1. [토스 페이먼츠 개발자센터](https://developers.tosspayments.com/) 접속
2. **Webhook** 메뉴 선택
3. Webhook URL 추가:
   - 개발: `https://your-ngrok-url.ngrok.io/api/webhooks/toss`
   - 프로덕션: `https://your-domain.com/api/webhooks/toss`
4. 이벤트 선택:
   - `PAYMENT_STATUS_CHANGED`
   - `BILLING_DELETED`

---

## 테스트 가이드

### 1. 빌링키 발급 테스트

1. 구독 페이지에서 "지금 업그레이드하기" 클릭
2. 카드 정보 입력:
   - 카드번호: 실제 카드의 앞 6자리만 맞으면 됨 (예: `4330120000000000`)
   - 유효기간: 미래 날짜 (예: `25/12`)
   - 생년월일: 6자리 (예: `990101`)
3. 카드 등록 완료 후 Supabase 확인:
   - `subscriptions` 테이블에 빌링키 저장 확인
   - `users` 테이블의 `subscription_tier`가 `pro`로 변경 확인

### 2. 정기결제 테스트

1. Supabase에서 `subscriptions.next_billing_date`를 오늘로 변경
2. Hono API 직접 호출:
   ```bash
   curl -X POST https://your-domain.com/api/subscription/billing/cron \
     -H "Content-Type: application/json" \
     -H "X-Cron-Secret: your-cron-secret-token" \
     -d '{"timestamp": "2025-01-26T02:00:00Z"}'
   ```
3. `payments` 테이블에 결제 내역 기록 확인

### 3. 구독 취소 테스트

1. 구독 관리 페이지에서 "구독 해지" 클릭
2. `subscriptions.status`가 `cancelled`로 변경 확인
3. 다음 결제일 전에 재구독 시도하여 `active`로 복원 확인

---

## 주의사항 및 알려진 이슈

### 1. SDK 선택 주의
- **Payment SDK** (`@tosspayments/payment-sdk`): API 개별 연동키 사용, 빌링/정기결제용
- **Payment Widget SDK** (`@tosspayments/payment-widget-sdk`): 결제위젯 연동키 사용, 일반 결제용
- 빌링키 발급에는 반드시 Payment SDK를 사용해야 함

### 2. 빌링키 발급 제한

- **자동결제 계약 필요**: 토스 페이먼츠와 별도 계약 없이는 빌링키 발급 불가
- **빌링키 조회 불가**: 한 번 발급된 빌링키는 다시 조회할 수 없으므로 DB에 안전하게 저장 필수
- **빌링키 삭제 API 없음**: 토스는 빌링키 삭제 API를 제공하지 않으므로 DB에서 직접 관리

### 3. 테스트 환경 주의사항

- 테스트 환경에서는 카드 BIN(앞 6자리)만 맞으면 테스트 가능
- 실제 카드 정보를 입력해도 돈이 출금되지 않음
- 프로덕션에서도 테스트 모드로 운영하려면 `test_` 키 사용

### 4. 정기결제 타이밍

- 정기결제 승인은 최대 30초 소요 가능
- Supabase Cron의 HTTP 요청 타임아웃을 30000ms로 설정 필요
- 다수의 구독 건이 있을 경우 Cron 작업이 길어질 수 있으므로 배치 처리 고려

### 5. Supabase Cron 시간대

- Supabase Cron은 UTC 시간 기준
- 한국 시간 02:00는 UTC 17:00 (전날)
- Cron 표현식: `0 17 * * *` (매일 UTC 17:00 = 한국 시간 다음날 02:00)

### 6. Secret Key 보안

- `TOSS_SECRET_KEY`는 절대 클라이언트에 노출하면 안 됨
- 빌링키 발급 API는 서버에서만 호출
- Basic Auth 인코딩 시 `{secretKey}:` 형식 (콜론 포함) 주의

### 7. 결제 실패 처리

- 카드 한도 초과, 카드 정지 등으로 결제 실패 가능
- 실패 시 즉시 구독 해지 정책 (요구사항에 따름)
- 재시도 로직이 필요하면 Cron 작업 수정 필요

---

## Step-by-Step 가이드

### Phase 1: 토스 페이먼츠 계정 설정 (20분)

1. 토스 페이먼츠 개발자센터 가입
2. 자동결제(빌링) 계약 문의 (테스트는 계약 없이 가능할 수 있음)
3. API Keys 복사 → `.env.local` 설정
4. 테스트: API Keys가 유효한지 확인

### Phase 2: Supabase 테이블 설정 (15분)

1. `subscriptions` 테이블 마이그레이션 실행
2. `payments` 테이블 마이그레이션 실행
3. Supabase Dashboard에서 테이블 생성 확인

### Phase 3: 빌링키 발급 UI 구현 (1시간)

1. `@tosspayments/payment-sdk` 설치
2. 구독 페이지 UI 생성
3. 빌링키 발급 페이지 생성
4. 성공 페이지 생성
5. 테스트: 카드 등록 플로우 진행

### Phase 4: Hono 백엔드 API 구현 (1시간)

1. `src/features/subscription/backend/` 폴더 생성
2. `service.ts`에 토스 API 호출 함수 작성
3. `route.ts`에 빌링키 발급 확정 API 작성
4. Hono App에 라우터 등록
5. 테스트: 빌링키 발급 완료 후 Supabase 확인

### Phase 5: 정기결제 Cron 설정 (45분)

1. Hono에 정기결제 Cron API 작성
2. Secret Token 환경변수 설정
3. Supabase에서 `pg_cron`, `pg_net` 확장 활성화
4. Supabase SQL Editor에서 Cron Job 생성
5. 테스트: 수동으로 Cron API 호출하여 결제 진행 확인

### Phase 6: 구독 취소 기능 구현 (30분)

1. 구독 취소 API 작성
2. 구독 재활성화 API 작성
3. 구독 관리 페이지에 취소 버튼 추가
4. 테스트: 취소 → 재활성화 플로우 확인

### Phase 7: Webhook 설정 (선택사항, 30분)

1. Webhook 엔드포인트 작성
2. 토스 페이먼츠 Dashboard에서 Webhook URL 등록
3. 테스트: 결제 이벤트 수신 확인

### Phase 8: 프로덕션 배포 (30분)

1. 프로덕션 API Keys로 변경 (`live_ck_`, `live_sk_`)
2. Supabase Cron URL을 프로덕션 도메인으로 변경
3. 토스 페이먼츠 자동결제 계약 확인
4. 테스트: 프로덕션 환경에서 빌링키 발급 진행

---

## 참고 자료

### 공식 문서
- [토스 페이먼츠 개발자센터](https://docs.tosspayments.com/)
- [Payment SDK 문서](https://docs.tosspayments.com/sdk/v2/js)
- [API Keys 가이드](https://docs.tosspayments.com/reference/using-api/api-keys)
- [자동결제(빌링) 이해하기](https://docs.tosspayments.com/guides/v2/billing)
- [자동결제(빌링) API 연동하기](https://docs.tosspayments.com/guides/v2/billing/integration-api)
- [Webhook 이벤트](https://docs.tosspayments.com/reference/using-api/webhook-events)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase pg_net](https://supabase.com/docs/guides/database/extensions/pg_net)

### 블로그 및 가이드
- [구독 결제 서비스 간단히 구현하기](https://www.tosspayments.com/blog/articles/22425)
- [토스 페이먼츠 API를 이용한 결제 위젯 구현하기](https://velog.io/@sanghyeon/토스-페이먼츠-API를-이용한-결제-위젯-구현하기-Feat.-NextJS-TypeScript)

---

## 체크리스트

배포 전 다음 항목을 확인하세요:

- [ ] 토스 페이먼츠 API Keys가 `.env.local`에 설정되어 있는가?
- [ ] 자동결제(빌링) 계약이 완료되었는가?
- [ ] Supabase `subscriptions`, `payments` 테이블이 생성되었는가?
- [ ] 빌링키 발급 UI가 정상 작동하는가?
- [ ] 빌링키 발급 확정 API가 Supabase에 저장하는가?
- [ ] Supabase Cron이 설정되었는가? (`pg_cron`, `pg_net` 활성화)
- [ ] Cron API에 Secret Token 검증이 구현되었는가?
- [ ] 정기결제 승인이 정상 작동하는가?
- [ ] 결제 실패 시 구독 해지가 정상 작동하는가?
- [ ] 구독 취소 및 재활성화가 정상 작동하는가?
- [ ] 테스트 모드 경고 문구가 표시되는가?
- [ ] 프로덕션 API Keys로 변경했는가?
- [ ] Webhook URL이 등록되었는가? (선택사항)

---

**문서 버전**: 2.0
**최종 업데이트**: 2025-10-28

**미확정 사항**:
- Pro 요금제 가격 (예시: 9,900원, 실제 금액으로 변경 필요)
- Supabase Cron 시간대 (한국 시간 02:00 = UTC 17:00)

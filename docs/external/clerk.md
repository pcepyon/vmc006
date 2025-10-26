# Clerk 연동 가이드

## 개요

이 문서는 Next.js 15 App Router 프로젝트에 Clerk 인증을 연동하고, Hono 백엔드와 Supabase DB를 통합하는 방법을 설명합니다.

**작성일**: 2025-10-26
**프로젝트**: 사주 분석 웹앱
**목적**: Google OAuth 기반 회원가입/로그인 구현, Supabase DB에 사용자 정보 동기화

---

## 연동 유형

### 1. SDK 연동
- **패키지**: `@clerk/nextjs`
- **용도**: Next.js 클라이언트/서버 컴포넌트에서 인증 상태 확인
- **주요 기능**:
  - 로그인/회원가입 UI 제공 (Clerk 기본 템플릿)
  - Google OAuth 설정
  - 사용자 세션 관리

### 2. API 연동
- **패키지**: `@hono/clerk-auth`
- **용도**: Hono 백엔드에서 JWT 검증
- **주요 기능**:
  - Hono 미들웨어로 인증 상태 검증
  - Clerk User ID 추출
  - 보호된 API 엔드포인트 구현

### 3. Webhook 연동
- **패키지**: `svix` (Webhook 서명 검증용)
- **용도**: Clerk 사용자 이벤트를 Supabase DB에 동기화
- **주요 이벤트**:
  - `user.created`: 신규 회원가입 시 Supabase에 사용자 등록
  - `user.updated`: 사용자 정보 업데이트 시 동기화
  - `user.deleted`: 사용자 삭제 시 Supabase에서도 삭제

---

## 설치 방법

### 1. Clerk SDK 설치

```bash
npm install @clerk/nextjs
```

### 2. Hono Clerk 미들웨어 설치

```bash
npm install @hono/clerk-auth
```

### 3. Webhook 검증 라이브러리 설치

```bash
npm install svix
```

---

## 환경변수 설정

### Clerk Dashboard에서 API Key 발급

1. [Clerk Dashboard](https://dashboard.clerk.com/)에 접속
2. 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **API Keys** 메뉴에서 다음 키 복사:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (개발: `pk_test_`, 프로덕션: `pk_live_`)
   - `CLERK_SECRET_KEY` (개발: `sk_test_`, 프로덕션: `sk_live_`)

### `.env.local` 파일 설정

```env
# Clerk 인증
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Clerk Webhook (나중에 설정)
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (기존 설정 유지)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Next.js 클라이언트 설정

### 1. Middleware 설정

`middleware.ts` 파일을 프로젝트 루트에 생성:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// 보호할 라우트 패턴 정의
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/subscription(.*)',
  '/analysis(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // 보호된 라우트에 대해서만 인증 확인
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Next.js 내부 파일과 정적 파일 제외
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API 라우트 포함
    '/(api|trpc)(.*)',
  ],
}
```

### 2. ClerkProvider 설정

`src/app/layout.tsx` 수정:

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '사주 분석 웹앱',
  description: 'AI 기반 사주 분석 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="ko">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### 3. 인증 UI 컴포넌트 사용 예시

로그인/회원가입 페이지에서 Clerk 기본 UI 사용:

```typescript
'use client'

import { SignIn, SignUp, UserButton, useUser } from '@clerk/nextjs'

// 로그인 페이지 (src/app/sign-in/[[...sign-in]]/page.tsx)
export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  )
}

// 회원가입 페이지 (src/app/sign-up/[[...sign-up]]/page.tsx)
export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  )
}

// 대시보드에서 사용자 정보 표시
export default function DashboardLayout() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) return <div>로딩 중...</div>

  return (
    <div>
      <header>
        <UserButton />
        <p>{user?.primaryEmailAddress?.emailAddress}</p>
      </header>
    </div>
  )
}
```

---

## Hono 백엔드 인증 설정

### 1. Clerk 인증 미들웨어 추가

`src/backend/middleware/withClerk.ts` 생성:

```typescript
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../hono/context'

/**
 * Clerk 인증 미들웨어
 * - JWT 검증 및 사용자 ID 추출
 */
export const withClerk = (): MiddlewareHandler<AppEnv> => {
  return clerkMiddleware()
}

/**
 * 인증 필수 미들웨어
 * - 로그인하지 않은 사용자 차단
 */
export const requireAuth = (): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const auth = getAuth(c)

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized', message: '로그인이 필요합니다.' }, 401)
    }

    // Context에 userId 저장
    c.set('userId', auth.userId)
    await next()
  }
}
```

### 2. Hono App에 미들웨어 적용

`src/backend/hono/app.ts` 수정:

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { errorBoundary } from '../middleware/errorBoundary'
import { withAppContext } from '../middleware/withAppContext'
import { withClerk } from '../middleware/withClerk'
import { withSupabase } from '../middleware/withSupabase'

export const runtime = 'nodejs'

let honoApp: Hono | null = null

export function createHonoApp() {
  if (honoApp) return honoApp

  const app = new Hono().basePath('/api')

  // 1. 에러 바운더리
  app.use('*', errorBoundary())

  // 2. 앱 컨텍스트 (logger, config)
  app.use('*', withAppContext())

  // 3. Clerk 인증 미들웨어 추가
  app.use('*', withClerk())

  // 4. Supabase 클라이언트
  app.use('*', withSupabase())

  // 5. 라우터 등록
  // registerAnalysisRoutes(app)
  // registerSubscriptionRoutes(app)

  honoApp = app
  return app
}

export default handle(createHonoApp())
```

### 3. Context 타입에 userId 추가

`src/backend/hono/context.ts` 수정:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export type AppEnv = {
  Variables: {
    supabase: SupabaseClient
    logger: Console
    config: AppConfig
    userId?: string // Clerk User ID 추가
  }
}

export type AppConfig = {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  clerkSecretKey: string
  clerkPublishableKey: string
}
```

### 4. 보호된 라우트 예시

`src/features/analysis/backend/route.ts`:

```typescript
import { Hono } from 'hono'
import { requireAuth } from '@/backend/middleware/withClerk'
import type { AppEnv } from '@/backend/hono/context'

const app = new Hono<AppEnv>()

// 인증 필수 라우트
app.post('/analysis', requireAuth(), async (c) => {
  const userId = c.get('userId') // Clerk User ID
  const supabase = c.get('supabase')

  // Supabase에서 사용자 정보 조회
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return c.json({ error: 'User not found' }, 404)
  }

  // 잔여 검사 횟수 확인
  if (user.remaining_tests <= 0) {
    return c.json({ error: 'No tests remaining' }, 403)
  }

  // 검사 로직 수행...

  return c.json({ message: 'Analysis completed', userId })
})

export default app
```

---

## Webhook 설정 (Clerk → Supabase 동기화)

### 1. Supabase Users 테이블 생성

`supabase/migrations/20250126000000_create_users_table.sql`:

```sql
-- Users 테이블 생성
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,                          -- Clerk User ID (예: user_xxxxxxxxxxxxx)
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  profile_image_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  remaining_tests INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription_tier ON public.users(subscription_tier);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 2. Webhook 엔드포인트 생성

`src/app/api/webhooks/clerk/route.ts`:

```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!

export async function POST(req: Request) {
  // Svix 헤더 추출
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Webhook 페이로드 파싱
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Webhook 서명 검증
  const wh = new Webhook(webhookSecret)
  let evt: WebhookEvent

  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Supabase 클라이언트 생성
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 이벤트 타입별 처리
  const eventType = evt.type

  switch (eventType) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data

      await supabase.from('users').insert({
        id,
        email: email_addresses[0]?.email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim(),
        profile_image_url: image_url,
        subscription_tier: 'free',
        remaining_tests: 3,
      })

      console.log(`✅ User created in Supabase: ${id}`)
      break
    }

    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data

      await supabase
        .from('users')
        .update({
          email: email_addresses[0]?.email_address,
          name: `${first_name || ''} ${last_name || ''}`.trim(),
          profile_image_url: image_url,
        })
        .eq('id', id)

      console.log(`✅ User updated in Supabase: ${id}`)
      break
    }

    case 'user.deleted': {
      const { id } = evt.data

      await supabase.from('users').delete().eq('id', id)

      console.log(`✅ User deleted from Supabase: ${id}`)
      break
    }

    default:
      console.log(`Unhandled event type: ${eventType}`)
  }

  return new Response('Webhook processed', { status: 200 })
}
```

### 3. Clerk Dashboard에서 Webhook 설정

1. [Clerk Dashboard](https://dashboard.clerk.com/) 접속
2. **Webhooks** 메뉴 선택
3. **Add Endpoint** 클릭
4. Endpoint URL 입력:
   - 개발: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - 프로덕션: `https://your-domain.com/api/webhooks/clerk`
5. 다음 이벤트 선택:
   - `user.created`
   - `user.updated`
   - `user.deleted`
6. **Signing Secret** 복사 후 `.env.local`에 `CLERK_WEBHOOK_SECRET`으로 저장

---

## Google OAuth 설정

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 (또는 기존 프로젝트 선택)
3. **APIs & Services** → **Credentials** 메뉴
4. **Create Credentials** → **OAuth 2.0 Client ID** 선택
5. Application type: **Web application**
6. Authorized JavaScript origins:
   - 개발: `http://localhost:3000`
   - 프로덕션: `https://your-domain.com`
7. Authorized redirect URIs:
   - Clerk에서 제공하는 URL 입력 (Clerk Dashboard에서 확인)
8. **Client ID**와 **Client Secret** 복사

### 2. Clerk에서 Google OAuth 설정

1. Clerk Dashboard → **User & Authentication** → **Social Connections**
2. **Google** 선택
3. **Use custom credentials** 토글 활성화
4. Google Client ID와 Client Secret 입력
5. **Enable for sign-up and sign-in** 활성화
6. 저장

### 3. 프로덕션 배포 시 주의사항

- Google OAuth 앱을 **"In production"** 상태로 변경
- 커스텀 도메인 필요 (Vercel의 `*.vercel.app` 도메인 사용 불가)
- Clerk DNS 레코드 추가 (CNAME 레코드):
  - Frontend API
  - Account Portal
  - Email 설정

---

## 사용자 인증 플로우

### 회원가입 → Supabase 동기화 플로우

```
1. 사용자가 Google OAuth로 회원가입
   ↓
2. Clerk에서 user.created 이벤트 발생
   ↓
3. Webhook이 /api/webhooks/clerk로 전송됨
   ↓
4. Webhook 핸들러가 Supabase users 테이블에 사용자 정보 저장
   (id: Clerk User ID, email, name, subscription_tier: 'free', remaining_tests: 3)
   ↓
5. 사용자가 대시보드로 이동
   ↓
6. Hono 백엔드가 Clerk JWT를 검증하여 userId 추출
   ↓
7. Supabase에서 userId로 사용자 정보 조회 (잔여 검사 횟수 등)
```

### 검사 수행 플로우

```
1. 사용자가 "새 검사" 시작
   ↓
2. 클라이언트가 Hono API 호출 (Authorization: Bearer <token>)
   ↓
3. Hono 미들웨어가 Clerk JWT 검증 → userId 추출
   ↓
4. Supabase에서 사용자 정보 조회
   - remaining_tests 확인
   - subscription_tier 확인 (free → gemini-2.5-flash, pro → gemini-2.5-pro)
   ↓
5. remaining_tests > 0이면 검사 수행
   ↓
6. 검사 완료 후 remaining_tests - 1 업데이트
```

---

## 최적화 제안

### 1. Hono에서 Clerk Backend API 사용

`@hono/clerk-auth`만으로는 사용자 정보를 직접 조회할 수 없습니다. 추가 정보가 필요하면 `@clerk/backend`를 사용하세요.

```bash
npm install @clerk/backend
```

```typescript
import { createClerkClient } from '@clerk/backend'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

// 사용자 정보 조회
const user = await clerkClient.users.getUser('user_xxxxxxxxxxxxx')
```

### 2. Webhook 재시도 처리

Webhook 처리 실패 시 Clerk이 자동으로 재시도합니다. 멱등성(Idempotency)을 보장하려면:

```typescript
// Supabase upsert 사용
await supabase.from('users').upsert({
  id,
  email: email_addresses[0]?.email_address,
  // ...
}, { onConflict: 'id' })
```

### 3. 백업: 대시보드 첫 접속 시 사용자 확인

Webhook이 실패할 경우를 대비하여, 대시보드 첫 접속 시 Supabase에 사용자가 없으면 생성:

```typescript
// src/features/user/backend/service.ts
export async function ensureUserExists(userId: string, clerkUser: any, supabase: SupabaseClient) {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!existingUser) {
    // Webhook이 실패했거나 아직 처리되지 않음 → 수동 생성
    await supabase.from('users').insert({
      id: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      profile_image_url: clerkUser.imageUrl,
      subscription_tier: 'free',
      remaining_tests: 3,
    })
  }
}
```

---

## 주의사항 및 알려진 이슈

### 1. Next.js 15 호환성

- `@clerk/nextjs` v6 이상 사용 필수 (Next.js 15 지원)
- `auth()` 헬퍼가 비동기(async)로 변경됨:
  ```typescript
  // ❌ 이전 버전 (v5)
  const { userId } = auth()

  // ✅ v6 이상
  const { userId } = await auth()
  ```

### 2. Fetch 캐싱 이슈

Next.js 15는 fetch의 기본 캐싱 동작이 변경되어 Clerk API 호출 시 rate limit에 걸릴 수 있습니다.
해결 방법: `@clerk/nextjs` 최신 버전 사용 (v6.10.2 이상)

### 3. Webhook 서명 검증 실패

- Svix 라이브러리는 **raw request body**를 요구합니다.
- Next.js에서 JSON 파싱 전 `await req.text()`로 원본 텍스트를 추출해야 합니다.
- ❌ `await req.json()` 후 `JSON.stringify()` 하면 서명 검증 실패

### 4. 프로덕션 배포 시 커스텀 도메인 필수

- Clerk 프로덕션 인스턴스는 `*.vercel.app` 도메인 사용 불가
- DNS CNAME 레코드 추가 필요 (최대 48시간 소요)

### 5. Google OAuth 게시 상태

- Google OAuth 앱을 **"Testing"** 상태로 두면 100명까지만 로그인 가능
- 프로덕션에서는 반드시 **"In production"** 상태로 변경

---

## Step-by-Step 가이드

### Phase 1: Clerk 기본 설정 (30분)

1. Clerk Dashboard에서 프로젝트 생성
2. API Keys 복사 → `.env.local` 설정
3. `npm install @clerk/nextjs` 실행
4. `middleware.ts` 생성 (보호 라우트 설정)
5. `app/layout.tsx`에 `ClerkProvider` 추가
6. 로그인/회원가입 페이지 생성 (`<SignIn />`, `<SignUp />`)
7. 테스트: `npm run dev` 후 회원가입 진행

### Phase 2: Google OAuth 설정 (20분)

1. Google Cloud Console에서 OAuth 2.0 Client ID 생성
2. Clerk Dashboard → Social Connections → Google 설정
3. Custom credentials 입력
4. 테스트: Google 계정으로 로그인

### Phase 3: Supabase DB 설정 (15분)

1. `supabase/migrations/` 폴더에 users 테이블 생성 SQL 작성
2. Supabase Dashboard에서 마이그레이션 실행
3. 테이블 생성 확인

### Phase 4: Webhook 설정 (30분)

1. `npm install svix` 실행
2. `src/app/api/webhooks/clerk/route.ts` 생성
3. ngrok 또는 로컬 터널링 설정 (개발 환경)
4. Clerk Dashboard → Webhooks → Endpoint 추가
5. Signing Secret 복사 → `.env.local` 설정
6. 테스트: 새 계정 생성 후 Supabase users 테이블 확인

### Phase 5: Hono 백엔드 인증 (30분)

1. `npm install @hono/clerk-auth` 실행
2. `src/backend/middleware/withClerk.ts` 생성
3. `src/backend/hono/app.ts`에 미들웨어 추가
4. `src/backend/hono/context.ts`에 `userId` 타입 추가
5. 보호된 API 라우트 생성 (`requireAuth()` 사용)
6. 테스트: 로그인 후 API 호출 → 401/200 응답 확인

### Phase 6: 프로덕션 배포 (1시간)

1. 커스텀 도메인 구매 및 DNS 설정
2. Clerk Dashboard → Production Instance 생성
3. DNS CNAME 레코드 추가 (Frontend API, Account Portal)
4. Google OAuth 앱 "In production" 상태로 변경
5. Vercel에 Production API Keys 설정 (`pk_live_`, `sk_live_`)
6. Webhook URL을 프로덕션 도메인으로 업데이트
7. 테스트: 프로덕션 환경에서 회원가입/로그인 진행

---

## 참고 자료

### 공식 문서
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Webhooks Overview](https://clerk.com/docs/webhooks/overview)
- [Clerk + Supabase Integration](https://clerk.com/docs/integrations/databases/supabase)
- [@hono/clerk-auth 패키지](https://github.com/honojs/middleware/tree/main/packages/clerk-auth)

### 블로그 및 가이드
- [Clerk Authentication in Next.js 15 App Router (2025)](https://www.buildwithmatija.com/blog/clerk-authentication-nextjs15-app-router)
- [Synchronize user data from Clerk to Supabase](https://clerk.com/blog/sync-clerk-user-data-to-supabase)
- [Hono by example: Integrating Clerk authentication](https://honobyexample.com/posts/clerk-backend)

### GitHub 예제
- [clerk-nextjs-app-quickstart](https://github.com/clerk/clerk-nextjs-app-quickstart)

---

## 체크리스트

배포 전 다음 항목을 확인하세요:

- [ ] Clerk API Keys가 `.env.local`에 설정되어 있는가?
- [ ] `middleware.ts`에서 보호 라우트가 올바르게 설정되었는가?
- [ ] Google OAuth가 Clerk에서 활성화되었는가?
- [ ] Supabase users 테이블이 생성되었는가?
- [ ] Webhook 엔드포인트가 Clerk에 등록되었는가?
- [ ] Webhook 서명 검증이 올바르게 구현되었는가?
- [ ] Hono 백엔드에서 `requireAuth()` 미들웨어가 동작하는가?
- [ ] 프로덕션 환경에서 커스텀 도메인 DNS가 설정되었는가?
- [ ] Google OAuth 앱이 "In production" 상태인가?
- [ ] 프로덕션 API Keys가 Vercel 환경 변수에 설정되었는가?

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-10-26

# VMC006 - AI 기반 사주 분석 서비스

> Google Gemini AI를 활용한 실시간 사주팔자 분석 플랫폼

VMC006은 최신 AI 기술을 사용하여 사용자의 생년월일과 출생시간을 바탕으로 사주를 분석하고 상세한 운세 정보를 제공하는 웹 애플리케이션입니다. 사용자는 무료로 3회의 검사를 받을 수 있으며, Pro 요금제를 구독하면 매월 10회의 고급 AI 모델을 사용한 분석이 가능합니다.

## 📋 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [환경 변수 설정](#-환경-변수-설정)
- [데이터베이스 마이그레이션](#-데이터베이스-마이그레이션)
- [주요 기능 상세](#-주요-기능-상세)
- [API 엔드포인트](#-api-엔드포인트)
- [테스트](#-테스트)
- [개발 가이드](#-개발-가이드)

---

## ✨ 주요 기능

### 🔮 AI 사주 분석
- **Google Gemini AI** 기반 실시간 사주팔자 분석
- 구독 티어에 따른 AI 모델 차등 적용
  - **Free**: Gemini 2.5 Flash Lite (빠른 분석)
  - **Pro**: Gemini 2.5 Pro (고급 심층 분석)
- 생년월일, 출생시간(선택), 성별 기반 개인화 분석
- 사주팔자, 오행 분석, 성격, 건강, 재물, 애정, 직업 등 종합 운세 제공

### 💳 구독 및 결제 시스템
- **TossPayments 빌링키 방식** 정기결제
- Free 티어: 3회 무료 검사
- Pro 티어: 월 9,900원, 매월 10회 검사
- 구독 해지 및 재활성화 기능
- 자동 정기결제 (매월 1일)
- 결제 실패 시 자동 구독 만료 처리

### 👤 사용자 관리
- **Clerk Authentication** 기반 회원 인증
- 소셜 로그인 지원
- 사용자별 검사 이력 관리
- 프로필 이미지 및 개인정보 관리

### 📊 대시보드
- 검사 이력 조회 및 검색
- 상세 분석 결과 열람
- 구독 정보 및 잔여 검사 횟수 확인
- 다음 결제일 안내

---

## 🛠 기술 스택

### Frontend
- **Next.js 15** - React 프레임워크 (App Router)
- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 우선 스타일링
- **shadcn-ui** - 재사용 가능한 UI 컴포넌트
- **React Query** - 서버 상태 관리
- **React Hook Form** - 폼 관리
- **Zod** - 스키마 유효성 검사

### Backend
- **Hono** - 경량 웹 프레임워크
- **Next.js Route Handler** - API 엔드포인트
- **Supabase** - PostgreSQL 데이터베이스
- **Clerk** - 인증 및 사용자 관리

### 외부 서비스
- **Google Gemini AI** - AI 사주 분석 엔진
- **TossPayments** - 정기결제 처리
- **Supabase pg_cron** - 정기 작업 스케줄링

### 테스트
- **Vitest** - 단위 및 통합 테스트
- **Playwright** - E2E 테스트
- **happy-dom** - 테스트 환경

### 주요 라이브러리
- `date-fns` - 날짜 처리
- `ts-pattern` - 패턴 매칭
- `es-toolkit` - 유틸리티 함수
- `zustand` - 경량 상태 관리
- `lucide-react` - 아이콘
- `framer-motion` - 애니메이션

---

## 📁 프로젝트 구조

```
VMC006/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # 대시보드 레이아웃 그룹
│   │   │   ├── dashboard/            # 검사 이력 및 새 검사
│   │   │   │   ├── new/              # 새 검사 페이지
│   │   │   │   └── result/[testId]/  # 검사 결과 상세
│   │   │   └── subscription/         # 구독 관리
│   │   │       └── billing/          # 결제 페이지
│   │   ├── api/
│   │   │   ├── [[...hono]]/          # Hono 앱 진입점
│   │   │   └── webhooks/             # Clerk Webhook
│   │   ├── sign-in/                  # 로그인 페이지
│   │   ├── sign-up/                  # 회원가입 페이지
│   │   └── page.tsx                  # 랜딩 페이지
│   │
│   ├── backend/                      # 백엔드 공통 레이어
│   │   ├── config/                   # 환경 변수 설정
│   │   ├── gemini/                   # Gemini AI 클라이언트
│   │   ├── hono/                     # Hono 앱 및 Context
│   │   ├── http/                     # HTTP 응답 헬퍼
│   │   ├── middleware/               # 공통 미들웨어
│   │   └── supabase/                 # Supabase 클라이언트
│   │
│   ├── features/                     # 기능별 모듈
│   │   ├── auth/                     # 사용자 인증
│   │   │   ├── backend/              # API 라우트, 서비스, 스키마
│   │   │   ├── hooks/                # React Query 훅
│   │   │   ├── lib/                  # DTO 재노출
│   │   │   └── server/               # 서버 유틸리티
│   │   ├── saju/                     # 사주 분석
│   │   │   ├── backend/
│   │   │   │   ├── route.ts          # API 라우트
│   │   │   │   ├── service.ts        # 비즈니스 로직
│   │   │   │   ├── schema.ts         # Zod 스키마
│   │   │   │   └── error.ts          # 에러 코드
│   │   │   ├── components/           # UI 컴포넌트
│   │   │   ├── hooks/                # React Query 훅
│   │   │   └── lib/                  # DTO
│   │   ├── subscription/             # 구독 관리
│   │   │   ├── backend/
│   │   │   │   ├── route.ts          # 구독 API
│   │   │   │   ├── service.ts        # 구독 로직
│   │   │   │   ├── toss-service.ts   # TossPayments 통합
│   │   │   │   ├── cronService.ts    # 정기결제 Cron
│   │   │   │   └── ...
│   │   │   ├── components/           # 구독 UI
│   │   │   └── hooks/                # 구독 훅
│   │   └── dashboard/                # 대시보드
│   │       ├── backend/
│   │       └── hooks/
│   │
│   ├── components/                   # 공통 컴포넌트
│   │   └── ui/                       # shadcn-ui 컴포넌트
│   ├── hooks/                        # 공통 훅
│   ├── lib/                          # 유틸리티
│   │   ├── remote/                   # API 클라이언트
│   │   ├── supabase/                 # Supabase 헬퍼
│   │   └── utils/                    # 유틸리티 함수
│   ├── constants/                    # 상수
│   └── test/                         # 테스트
│       ├── unit/                     # 단위 테스트
│       ├── integration/              # 통합 테스트
│       ├── e2e/                      # E2E 테스트
│       ├── mocks/                    # Mock 데이터
│       └── helpers/                  # 테스트 헬퍼
│
├── supabase/
│   └── migrations/                   # 데이터베이스 마이그레이션
│       ├── 20250126000000_create_users_table.sql
│       ├── 20250126000001_create_saju_tests_table.sql
│       ├── 20250126000002_create_subscriptions_table.sql
│       ├── 20250126000003_create_payments_table.sql
│       ├── 20250126000004_create_triggers.sql
│       ├── 20250126000005_create_subscription_functions.sql
│       └── 20250126000006_create_billing_cron.sql
│
├── public/                           # 정적 파일
├── .env.example                      # 환경 변수 예제
├── CLAUDE.md                         # 개발 가이드라인
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
└── playwright.config.ts
```

---

## 🚀 시작하기

### 사전 요구사항

- **Node.js** 20.x 이상
- **npm** 또는 **yarn**
- **Supabase** 프로젝트 (데이터베이스)
- **Clerk** 계정 (인증)
- **TossPayments** 계정 (결제)
- **Google AI Studio** API Key (Gemini)

### 설치

1. **저장소 클론**

```bash
git clone <repository-url>
cd VMC006
```

2. **의존성 설치**

```bash
npm install
```

3. **환경 변수 설정**

`.env.example` 파일을 `.env.local`로 복사하고 값을 입력합니다.

```bash
cp .env.example .env.local
```

자세한 환경 변수 설정은 [환경 변수 설정](#-환경-변수-설정) 섹션을 참조하세요.

4. **데이터베이스 마이그레이션**

Supabase 대시보드에서 `supabase/migrations` 폴더의 SQL 파일들을 순서대로 실행합니다.

자세한 마이그레이션 방법은 [데이터베이스 마이그레이션](#-데이터베이스-마이그레이션) 섹션을 참조하세요.

5. **개발 서버 실행**

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인합니다.

---

## 🔐 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 설정해야 합니다.

### Clerk Authentication

[Clerk Dashboard](https://dashboard.clerk.com)에서 프로젝트를 생성하고 API 키를 발급받습니다.

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://your-app.accounts.dev/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=https://your-app.accounts.dev/sign-up
NEXT_PUBLIC_CLERK_USER_PROFILE_URL=https://your-app.accounts.dev/user
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

**Webhook 설정**:
- Clerk Dashboard → Webhooks → Add Endpoint
- Endpoint URL: `https://your-domain.com/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`

### Supabase

[Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트를 생성하고 API 키를 복사합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://xxx.supabase.co
```

**주의**: `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트에 노출되어서는 안 됩니다.

### Google Gemini AI

[Google AI Studio](https://aistudio.google.com/app/apikey)에서 API 키를 발급받습니다.

```env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### TossPayments

[TossPayments 개발자센터](https://docs.tosspayments.com)에서 API 키를 발급받습니다.

```env
TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**주의**: 테스트 키로 시작하고, 프로덕션 배포 시 라이브 키로 변경합니다.

### Cron Secret

정기결제 Cron Job 인증을 위한 시크릿 토큰입니다. 랜덤 문자열을 생성합니다.

```env
CRON_SECRET_TOKEN=your-random-secret-token-here
```

```bash
# 랜덤 토큰 생성 예시
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ 데이터베이스 마이그레이션

### Supabase 대시보드에서 마이그레이션 실행

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **SQL Editor** 메뉴로 이동
3. `supabase/migrations` 폴더의 SQL 파일들을 **순서대로** 실행

#### 실행 순서

```
1. 20250126000000_create_users_table.sql
2. 20250126000001_create_saju_tests_table.sql
3. 20250126000002_create_subscriptions_table.sql
4. 20250126000003_create_payments_table.sql
5. 20250126000004_create_triggers.sql
6. 20250126000005_create_subscription_functions.sql
7. 20250126000006_create_billing_cron.sql
```

### 주요 테이블 설명

#### `users`
- Clerk 사용자 정보와 동기화
- 구독 티어 및 잔여 검사 횟수 관리

#### `saju_tests`
- 사주 검사 이력 저장
- AI 분석 결과 (요약 및 전체 결과)

#### `subscriptions`
- Pro 구독 정보
- 빌링키 및 다음 결제일 관리

#### `payments`
- 모든 결제 내역 기록 (성공/실패)

### Cron Jobs 설정

마이그레이션 실행 후 다음 Cron Job이 자동으로 설정됩니다:

- **정기결제 Cron**: 매월 1일 00:00 실행
- **구독 만료 Cron**: 매일 00:00 실행

Cron Job이 정상적으로 호출하려면 `CRON_SECRET_TOKEN` 환경 변수가 설정되어 있어야 합니다.

---

## 📖 주요 기능 상세

### 1. 사주 분석 플로우

#### 1.1 검사 실행
1. 사용자가 대상자 정보 입력 (이름, 생년월일, 출생시간, 성별)
2. 잔여 검사 횟수 확인 (`remaining_tests > 0`)
3. 구독 티어에 따라 AI 모델 선택
   - Free: `gemini-2.5-flash-lite`
   - Pro: `gemini-2.5-pro`
4. 검사 레코드 생성 (`status: 'processing'`)
5. 잔여 횟수 즉시 차감 (동시성 제어)
6. Google Gemini API 호출 (30초 타임아웃, 3회 재시도)
7. AI 응답 파싱 및 저장
   - `summary_result`: 모달용 요약 (200자 이내)
   - `full_result`: 전체 분석 결과 (마크다운)
8. 검사 상태 업데이트 (`completed` 또는 `failed`)

#### 1.2 에러 처리
- **잔여 횟수 부족**: `NO_TESTS_REMAINING` (403)
- **AI 타임아웃**: `AI_TIMEOUT` (504) - 횟수 복구 안 함
- **AI 요청 제한**: `AI_RATE_LIMIT` (429) - 횟수 복구
- **AI 서비스 오류**: `AI_SERVICE_ERROR` (500) - 횟수 복구

### 2. 구독 관리 플로우

#### 2.1 Pro 구독 시작
1. 사용자가 "Pro 업그레이드" 버튼 클릭
2. `customerKey` 생성 (UUID)
3. TossPayments 빌링 위젯 렌더링
4. 사용자가 카드 정보 입력
5. TossPayments에서 `authKey` 발급
6. 백엔드로 `authKey` 전송
7. TossPayments API로 빌링키 발급
8. Supabase 트랜잭션으로 다음 작업 수행:
   - `subscriptions` 테이블에 구독 생성
   - `users` 테이블 업데이트
     - `subscription_tier = 'pro'`
     - `remaining_tests = 10`
     - `next_billing_date = 현재일 + 1개월`
9. 구독 페이지로 리디렉션

#### 2.2 정기결제 처리
- **실행 주기**: 매월 1일 00:00 (Supabase pg_cron)
- **처리 로직**:
  1. `next_billing_date = 오늘`이고 `status = 'active'`인 구독 조회
  2. 각 구독에 대해 빌링키로 결제 승인 (9,900원)
  3. **성공 시**:
     - `next_billing_date` 1개월 연장
     - `remaining_tests = 10` 충전
     - `payments` 테이블에 성공 기록 저장
  4. **실패 시**:
     - 구독 상태를 `expired`로 변경
     - `subscription_tier = 'free'`로 전환
     - `payments` 테이블에 실패 기록 저장

#### 2.3 구독 해지
1. 사용자가 "구독 해지" 버튼 클릭
2. 확인 모달 표시
3. 구독 상태를 `cancelled`로 변경
4. `billing_key` 및 `customer_key`를 NULL로 설정
5. `next_billing_date`까지 Pro 혜택 유지
6. 다음 결제일 이후 자동으로 Free 티어로 전환

#### 2.4 구독 재활성화
- **조건**: 빌링키가 남아있는 경우만 가능
- **제약**: 해지 후 빌링키가 삭제되면 재활성화 불가 (새로 구독해야 함)

---

## 🌐 API 엔드포인트

모든 API는 `/api` 경로 아래에 있으며, Clerk 인증이 필요합니다.

### 인증 (Auth)

#### `GET /api/user/me`
현재 로그인한 사용자 정보 조회

**응답**:
```json
{
  "id": "user_xxx",
  "email": "user@example.com",
  "name": "홍길동",
  "profileImageUrl": "https://...",
  "subscriptionTier": "free",
  "remainingTests": 3,
  "createdAt": "2025-01-26T00:00:00Z",
  "updatedAt": "2025-01-26T00:00:00Z"
}
```

---

### 사주 분석 (Saju)

#### `POST /api/saju/analyze`
새 사주 검사 실행

**요청 바디**:
```json
{
  "testName": "홍길동",
  "birthDate": "1990-01-01",
  "birthTime": "14:30",
  "isBirthTimeUnknown": false,
  "gender": "male"
}
```

**응답**:
```json
{
  "testId": "550e8400-e29b-41d4-a716-446655440000",
  "summaryResult": "귀하의 사주는...",
  "status": "completed"
}
```

#### `GET /api/saju/tests/:testId`
검사 결과 상세 조회

**응답**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "testName": "홍길동",
  "birthDate": "1990-01-01",
  "birthTime": "14:30:00",
  "gender": "male",
  "status": "completed",
  "aiModel": "gemini-2.5-pro",
  "summaryResult": "귀하의 사주는...",
  "fullResult": "# 사주팔자 분석 결과\n\n...",
  "createdAt": "2025-01-26T00:00:00Z",
  "completedAt": "2025-01-26T00:00:30Z"
}
```

#### `GET /api/saju/tests`
검사 이력 목록 조회 (페이지네이션)

**쿼리 파라미터**:
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지 크기 (기본값: 10)
- `search` (optional): 이름 검색

**응답**:
```json
{
  "tests": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "testName": "홍길동",
      "birthDate": "1990-01-01",
      "status": "completed",
      "createdAt": "2025-01-26T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 25,
    "totalPages": 3
  }
}
```

---

### 구독 (Subscription)

#### `GET /api/subscription`
구독 정보 조회

**응답**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user_xxx",
  "status": "active",
  "cardCompany": "신한",
  "cardNumber": "1234",
  "nextBillingDate": "2025-02-01",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

#### `POST /api/subscription/billing/confirm`
빌링키 발급 및 구독 생성

**요청 바디**:
```json
{
  "authKey": "auth_key_from_toss",
  "customerKey": "customer_xxx"
}
```

**응답**:
```json
{
  "subscriptionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active",
  "nextBillingDate": "2025-02-01"
}
```

#### `POST /api/subscription/cancel`
구독 해지

**응답**:
```json
{
  "message": "구독이 해지되었습니다.",
  "expiresAt": "2025-02-01"
}
```

#### `POST /api/subscription/reactivate`
구독 재활성화

**응답**:
```json
{
  "message": "구독이 재활성화되었습니다.",
  "nextBillingDate": "2025-02-01"
}
```

---

### 대시보드 (Dashboard)

#### `GET /api/user/subscription`
사용자 구독 정보 요약

**응답**:
```json
{
  "subscriptionTier": "pro",
  "remainingTests": 7,
  "nextBillingDate": "2025-02-01"
}
```

---

## 🧪 테스트

### 단위 테스트

Vitest를 사용한 비즈니스 로직 테스트

```bash
# 단위 테스트 실행
npm run test

# Watch 모드
npm run test:watch

# UI 모드
npm run test:ui

# 커버리지
npm run test:coverage
```

**테스트 파일 위치**: `src/test/unit/`

### 통합 테스트

Hono 라우터 + 미들웨어 통합 테스트

```bash
npm run test
```

**테스트 파일 위치**: `src/test/integration/`

### E2E 테스트

Playwright를 사용한 전체 플로우 테스트

```bash
# E2E 테스트 실행
npm run test:e2e

# UI 모드
npm run test:e2e:ui

# 헤드리스 모드
npm run test:e2e -- --headed
```

**테스트 파일 위치**: `src/test/e2e/`

**주요 테스트 시나리오**:
- 사용자 인증 플로우
- 사주 분석 실행 및 결과 조회
- 구독 시작 및 해지
- 대시보드 내비게이션

---

## 🏗️ 개발 가이드

### 코드 스타일

- **함수형 프로그래밍**: Immutable 데이터, Pure Functions 우선
- **Early Return**: 조기 반환으로 중첩 최소화
- **타입 안전성**: TypeScript strict 모드, Zod 스키마 유효성 검사
- **명확한 네이밍**: 축약어 지양, 의도가 명확한 변수/함수명

### 새 기능 추가

`src/features/[featureName]` 디렉토리 구조를 따라 개발합니다.

```
src/features/[featureName]/
  ├── backend/
  │   ├── route.ts       # Hono 라우터
  │   ├── service.ts     # 비즈니스 로직
  │   ├── schema.ts      # Zod 스키마
  │   └── error.ts       # 에러 코드
  ├── components/        # React 컴포넌트
  ├── hooks/             # React Query 훅
  ├── lib/               # DTO 재노출
  └── constants/         # 상수
```

### shadcn-ui 컴포넌트 추가

```bash
npx shadcn@latest add dialog
npx shadcn@latest add card
npx shadcn@latest add button
```

### 데이터베이스 마이그레이션 추가

1. `supabase/migrations` 폴더에 새 SQL 파일 생성
   ```
   supabase/migrations/YYYYMMDDHHMMSS_description.sql
   ```

2. 마이그레이션 작성 (Idempotent하게)
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. Supabase 대시보드에서 실행

### 에러 처리

각 기능의 `error.ts` 파일에 에러 코드를 정의합니다.

```typescript
export const myFeatureErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
} as const;

export type MyFeatureErrorCode = typeof myFeatureErrorCodes[keyof typeof myFeatureErrorCodes];
```

서비스에서 에러를 반환합니다.

```typescript
import { failure } from '@/backend/http/response';
import { myFeatureErrorCodes } from './error';

export function myService() {
  return failure(404, myFeatureErrorCodes.NOT_FOUND, 'Resource not found');
}
```

---

## 📝 주요 패키지 스크립트

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 린팅
npm run lint

# 타입 체크
npm run type-check

# 테스트
npm run test              # 단위 + 통합 테스트
npm run test:ui           # 테스트 UI
npm run test:run          # CI 모드
npm run test:e2e          # E2E 테스트
npm run test:e2e:ui       # Playwright UI
```

---

## 🌟 주요 개선 제안

현재 프로젝트는 프로덕션 배포 준비가 완료된 상태이며, 다음과 같은 개선 사항을 고려할 수 있습니다:

1. **로깅 강화**: Console Logger → Sentry/Datadog 연동
2. **캐싱 전략**: React Query 캐시 시간 최적화
3. **모니터링**: APM 도구 연동 (New Relic, Sentry)
4. **이미지 최적화**: Next.js Image 컴포넌트 활용
5. **코드 스플리팅**: Dynamic Import로 번들 크기 최적화
6. **API 문서화**: Swagger/OpenAPI 자동 생성

---

## 📄 라이선스

이 프로젝트는 비공개 프로젝트입니다.

---

## 🤝 기여

이 프로젝트는 현재 비공개 개발 중입니다.

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 개발팀에 연락해주세요.

---

**Built with ❤️ using Next.js, Hono, and Google Gemini AI**

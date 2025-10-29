## AI 코딩 에이전트 지침: 최종 테스트 환경 구축 보고서

이 보고서는 MVP의 **신속한 개발 Iteration (속도)** 및 **오류 없는 내부 베타테스트 (안정성)** 목표 달성을 위한 최종 지침입니다. 다음 지침에 따라 테스트 환경 구축 및 테스트 코드 작성을 진행합니다. **오버엔지니어링을 철저히 회피하고, 핵심 비즈니스 로직에 집중합니다.**

---

### 1. 최종 기술 스택 (Final Tooling)

| 구분 | 기술 스택 | 사용 목적 | 핵심 가치 |
| :--- | :--- | :--- | :--- |
| **단위/통합 테스트** | **Vitest** (w/ Hono Test Client) | FE 컴포넌트, React Hooks, BE Service Layer (비즈니스 로직) 검증 | **신속함, 간결함** |
| **E2E/시나리오 테스트** | **Playwright** | 실제 브라우저 기반의 Critical Path (인증, API 통합) 검증 | **안정성, 확장성** |
| **Mocking** | **Vitest Mocking API** & **Hono 조건부 Mocking 계층** | 모든 외부 API 및 DB 호출 격리 (MSW 도입 배제) | **오버엔지니어링 회피** |

---

### 2. 최우선 과제: 외부 의존성 격리 전략 (**Critical Priority**)

가장 큰 위험 요소인 느리고 불안정한 외부 API 호출(Gemini, Toss Payments)을 제거하여 테스트 속도와 안정성을 확보해야 합니다.

#### **지침: Hono 서비스 계층 조건부 Mocking 구현**

1.  **Gemini API Mocking:**
    *   `src/features/saju/backend/service.ts`의 `analyzeSaju` 함수 내부에서 `getGeminiClient()` 호출 시, `NODE_ENV=test` 환경 변수 또는 주입된 옵션에 따라 실제 Gemini 호출 대신, **미리 정의된 Mock 응답 JSON**을 반환하는 함수를 사용하도록 로직을 분리합니다.
    *   Mock 응답은 **성공(summary/full_analysis)** 및 **실패(rate limit, timeout)** 케이스를 포함해야 합니다.
2.  **Toss Payments API Mocking:**
    *   `src/features/subscription/backend/tossPayments.ts` 및 `src/features/subscription/backend/toss-service.ts`의 **모든 외부 `fetch` 호출**을 테스트 환경에서 Mocking합니다.
    *   `chargeBillingKey`, `issueBillingKey` 함수가 **Mock 객체**를 주입받거나, `fetch` 호출을 `vi.mock('node-fetch')` 등으로 완벽하게 가로채도록 설정합니다.

---

### 3. 테스트 작성 전략 (Actionable Plan)

#### **A. Vitest 단위 테스트 (BE Service Layer)**

*   **목표:** 순수한 비즈니스 로직 검증.
*   **전략:** `src/features/*/backend/service.ts` 파일에 집중합니다.
    *   **Supabase Mocking:** `vi.mock`을 사용하여 `SupabaseClient`의 `from().select().single()` 체이닝에 대해 Mock 데이터를 반환하도록 구성합니다.
    *   **핵심 검증:** `analyzeSaju` 함수에서 **잔여 횟수 차감 및 복구 로직**, **프롬프트 생성 정확성**, **에러 시 상태 업데이트** 등 핵심 비즈니스 로직의 분기 처리를 확인합니다. **(Mocking 스키마 불일치 위험을 감수하고 속도 우선)**

#### **B. Hono 통합 테스트 (API Path Coverage)**

*   **목표:** 라우팅, 미들웨어(`withClerk`, `withSupabase`), Zod 유효성 검사, 최종 응답 형식 검증.
*   **전략:** `src/backend/hono/app.ts`를 가져와 Hono Test Client로 테스트합니다.
    *   **Clerk/Supabase Mocking:** 테스트 환경에서는 `requireAuth()` 미들웨어에서 `c.set('userId', 'mock_user_id')`를 강제로 주입하고, `withSupabase()`는 Mocking된 Supabase Client (또는 상기 2번의 Mocking 계층)를 주입해야 합니다.
    *   **최소 요구사항:** 모든 주요 API 엔드포인트 (`POST /saju/analyze`, `GET /user/me`, `POST /subscription/billing/confirm` 등)에 대해 **인증 유무, 유효성 검사 실패, 성공 응답 형식**을 테스트합니다.

#### **C. Playwright E2E 테스트 (Critical Path)**

*   **목표:** 실제 사용자 시나리오 (로그인, 새 검사 수행, 구독 업그레이드) 검증.
*   **전략:**
    *   **인증 처리:** **`storageState`를 이용하여 Clerk 로그인 세션 저장을 구현**하고, 모든 테스트가 로그인된 상태에서 시작하도록 합니다.
    *   **API 의존성:** **반드시** 상기 2번에서 구현한 **Mocking된 Hono Backend**를 사용해야 합니다. (실제 Gemini/Toss 호출 배제).
    *   **테스트 케이스:**
        *   로그인 후 대시보드 접근 및 검사 이력 확인.
        *   새 검사 수행 (Mocked Gemini를 통해) 및 결과 모달 확인.
        *   Pro 구독 플로우 시작 및 빌링키 발급 확정 (Mocked Toss를 통해) 시 Pro 등급으로 변경 확인.
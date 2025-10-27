# 웹훅 디버깅 가이드

Clerk 웹훅의 작동 상태를 확인하고 문제를 진단하기 위한 디버깅 시스템 사용 가이드입니다.

## 목차

- [개요](#개요)
- [헬스체크 사용법](#헬스체크-사용법)
- [실시간 로그 모니터링](#실시간-로그-모니터링)
- [단계별 로그 설명](#단계별-로그-설명)
- [웹훅 테스트 방법](#웹훅-테스트-방법)
- [문제 해결 가이드](#문제-해결-가이드)

---

## 개요

### 디버깅 시스템 기능

현재 웹훅 엔드포인트(`/api/webhooks/clerk`)에는 다음 기능이 구현되어 있습니다:

1. **헬스체크 엔드포인트** (GET)
   - 환경 변수 설정 상태 확인
   - 웹훅 엔드포인트 정상 작동 여부 확인

2. **단계별 상세 로깅** (POST)
   - 6단계로 나눈 웹훅 처리 과정 추적
   - requestId 기반 로그 추적
   - 각 단계별 성공/실패 상태 표시
   - 처리 시간 측정

### 로그 단계 구성

```
1단계: Svix 헤더 검증
2단계: 페이로드 파싱
3단계: 서명 검증
4단계: 이벤트 스키마 검증
5단계: Supabase 연결
6단계: 이벤트 처리
  ├─ 6-A: 사용자 생성 (user.created)
  ├─ 6-B: 사용자 업데이트 (user.updated)
  └─ 6-C: 사용자 삭제 (user.deleted)
```

---

## 헬스체크 사용법

### 1. 브라우저에서 확인

프로덕션 URL:
```
https://your-domain.vercel.app/api/webhooks/clerk
```

로컬 개발:
```
http://localhost:3000/api/webhooks/clerk
```

### 2. 터미널에서 확인

```bash
# 프로덕션
curl https://your-domain.vercel.app/api/webhooks/clerk

# 로컬
curl http://localhost:3000/api/webhooks/clerk
```

### 3. 응답 예시

**정상 상태:**
```json
{
  "status": "ok",
  "endpoint": "/api/webhooks/clerk",
  "timestamp": "2025-01-27T12:34:56.789Z",
  "environment": "production",
  "config": {
    "hasWebhookSecret": true,
    "webhookSecretPrefix": "whsec_uwGZD",
    "hasSupabaseUrl": true,
    "supabaseUrl": "https://osuvrgsgbhibunwzyruk.supabase.co",
    "hasSupabaseServiceKey": true,
    "serviceKeyPrefix": "eyJhbGciOiJIUzI1NiIs"
  }
}
```

**환경 변수 누락 상태:**
```json
{
  "status": "ok",
  "endpoint": "/api/webhooks/clerk",
  "timestamp": "2025-01-27T12:34:56.789Z",
  "environment": "production",
  "config": {
    "hasWebhookSecret": false,          // ❌ 문제!
    "webhookSecretPrefix": "not set",
    "hasSupabaseUrl": true,
    "supabaseUrl": "https://osuvrgsgbhibunwzyruk.supabase.co",
    "hasSupabaseServiceKey": true,
    "serviceKeyPrefix": "eyJhbGciOiJIUzI1NiIs"
  }
}
```

### 4. 환경 변수 확인 항목

| 필드 | 설명 | 필수 여부 |
|------|------|-----------|
| `hasWebhookSecret` | Clerk 웹훅 서명 검증 키 | ✅ 필수 |
| `hasSupabaseUrl` | Supabase 프로젝트 URL | ✅ 필수 |
| `hasSupabaseServiceKey` | Supabase 서비스 역할 키 | ✅ 필수 |

모든 값이 `true`이면 정상입니다.

---

## 실시간 로그 모니터링

### 1. Vercel CLI 설치 및 로그인

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 로그인
vercel login

# 프로젝트 디렉토리 이동
cd /Users/pro16/Desktop/project/VMC006
```

### 2. 실시간 로그 스트리밍

**전체 로그:**
```bash
vercel logs --follow
```

**웹훅 관련 로그만 필터링:**
```bash
vercel logs --follow | grep -E "━|단계|성공|실패|Webhook|requestId"
```

**특정 키워드 검색:**
```bash
# user.created 이벤트만 확인
vercel logs --follow | grep "user.created"

# 에러만 확인
vercel logs --follow | grep "❌"

# 성공 로그만 확인
vercel logs --follow | grep "✅"
```

### 3. Vercel Dashboard에서 확인

```
1. https://vercel.com/dashboard 접속
2. 프로젝트 선택
3. Logs 탭
4. 검색창에 "webhook" 입력
```

---

## 단계별 로그 설명

### 로그 구조

각 웹훅 요청은 고유한 `requestId`로 추적됩니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 [abc12345] Webhook 요청 수신: 2025-01-27T12:34:56.789Z
📍 [abc12345] URL: https://...
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 1단계: Svix 헤더 검증

**로그 예시:**
```
📋 [abc12345] 1단계: 헤더 검증
   - svix-id: msg_2bKJN8QVGFpqxT5R0YZfwK8Lqm3
   - svix-timestamp: 1674840123
   - svix-signature: v1,g3dtwb9...
✅ [abc12345] 1단계 성공: 헤더 검증 완료
```

**실패 시:**
```
📋 [abc12345] 1단계: 헤더 검증
   - svix-id: ❌ 없음
   - svix-timestamp: ❌ 없음
   - svix-signature: ❌ 없음
❌ [abc12345] 1단계 실패: Svix 헤더 누락
```

**원인:**
- Clerk에서 웹훅을 보내지 않음
- 웹훅 엔드포인트 URL이 잘못됨
- Clerk 웹훅 설정이 비활성화됨

### 2단계: 페이로드 파싱

**로그 예시:**
```
📦 [abc12345] 2단계: 페이로드 파싱
   - 페이로드 길이: 1234 bytes
```

**확인 사항:**
- 페이로드 크기가 0이면 빈 요청
- 일반적으로 500-2000 bytes

### 3단계: 서명 검증

**로그 예시:**
```
🔐 [abc12345] 3단계: 서명 검증
   - Webhook Secret 존재: true
   - Webhook Secret Prefix: whsec_uwGZD
✅ [abc12345] 3단계 성공: 서명 검증 완료
```

**실패 시:**
```
🔐 [abc12345] 3단계: 서명 검증
   - Webhook Secret 존재: true
   - Webhook Secret Prefix: whsec_uwGZD
❌ [abc12345] 3단계 실패: 서명 검증 실패
   - 에러: Error: Invalid signature
```

**원인:**
- `CLERK_WEBHOOK_SECRET`이 Clerk Dashboard의 Signing Secret과 불일치
- 환경 변수가 Vercel에 설정되지 않음
- 잘못된 secret 값 입력

### 4단계: 이벤트 스키마 검증

**로그 예시:**
```
📝 [abc12345] 4단계: 이벤트 스키마 검증
✅ [abc12345] 4단계 성공: 이벤트 파싱 완료
   - 이벤트 타입: user.created
   - 사용자 ID: user_2bKJN8QVGFpqxT5R0YZfwK8Lqm3
   - 사용자 이메일: test@example.com
```

**실패 시:**
```
❌ [abc12345] 4단계 실패: 이벤트 형식 검증 실패
   - Zod 에러: {
       "type": { "_errors": ["Invalid enum value"] }
     }
```

**원인:**
- Clerk에서 보낸 이벤트 형식이 예상과 다름
- 스키마 정의(`ClerkWebhookEventSchema`)와 불일치
- Clerk API 버전 변경

### 5단계: Supabase 연결

**로그 예시:**
```
💾 [abc12345] 5단계: Supabase 연결
   - Supabase URL: https://osuvrgsgbhibunwzyruk.supabase.co
   - Service Key 존재: true
✅ [abc12345] 5단계 성공: Supabase 클라이언트 생성 완료
```

**확인 사항:**
- Supabase URL이 정확한지 확인
- Service Key가 설정되어 있는지 확인
- 클라이언트 생성만 확인 (실제 연결은 6단계에서 테스트)

### 6단계: 이벤트 처리

#### 6-A: 사용자 생성 (user.created)

**로그 예시:**
```
⚙️ [abc12345] 6단계: 이벤트 처리 시작 (user.created)
   [abc12345] 6-A: createUser 호출
✅ [abc12345] 6-A 성공: 사용자 생성 완료 (user_2bKJN8QVGFpqxT5R0YZfwK8Lqm3)
✅ [abc12345] 모든 단계 성공
⏱️ [abc12345] 처리 시간: 345ms
```

**실패 시:**
```
⚙️ [abc12345] 6단계: 이벤트 처리 시작 (user.created)
   [abc12345] 6-A: createUser 호출
❌ [abc12345] 6-A 실패: 사용자 생성 실패
   - 에러 코드: USER_CREATE_ERROR
   - 에러 메시지: Failed to create user: duplicate key value violates unique constraint "users_pkey"
   - HTTP 상태: 500
```

**원인:**
- Supabase 연결 실패
- `users` 테이블이 존재하지 않음
- 중복된 사용자 ID
- 필수 필드 누락 (email)
- RLS 정책 문제

#### 6-B: 사용자 업데이트 (user.updated)

**로그 예시:**
```
⚙️ [abc12345] 6단계: 이벤트 처리 시작 (user.updated)
   [abc12345] 6-B: updateUser 호출
✅ [abc12345] 6-B 성공: 사용자 업데이트 완료 (user_2bKJN8QVGFpqxT5R0YZfwK8Lqm3)
```

#### 6-C: 사용자 삭제 (user.deleted)

**로그 예시:**
```
⚙️ [abc12345] 6단계: 이벤트 처리 시작 (user.deleted)
   [abc12345] 6-C: deleteUser 호출
✅ [abc12345] 6-C 성공: 사용자 삭제 완료 (user_2bKJN8QVGFpqxT5R0YZfwK8Lqm3)
```

### 처리 완료

**성공 시:**
```
✅ [abc12345] 모든 단계 성공
⏱️ [abc12345] 처리 시간: 345ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**실패 시:**
```
❌ [abc12345] 예상치 못한 에러 (234ms)
   - 에러: TypeError: Cannot read property 'id' of undefined
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 웹훅 테스트 방법

### 방법 1: Clerk Dashboard에서 테스트 이벤트 전송

**가장 빠르고 간단한 방법**

1. **Clerk Dashboard 접속**
   ```
   https://dashboard.clerk.com
   ```

2. **Webhooks 메뉴 → 엔드포인트 선택**

3. **Testing 탭 클릭**

4. **테스트 이벤트 전송**
   - "Send Example" 버튼 클릭
   - 이벤트 타입 선택 (user.created, user.updated, user.deleted)
   - "Send" 클릭

5. **로그 확인**
   ```bash
   # 터미널에서 실시간 로그 확인
   vercel logs --follow

   # 또는 Clerk Dashboard → Webhooks → Logs 탭
   ```

### 방법 2: 실제 사용자 생성

**프로덕션 환경 전체 플로우 테스트**

1. **시크릿 모드 브라우저 열기**

2. **회원가입 페이지 접속**
   ```
   https://your-domain.vercel.app/sign-up
   ```

3. **테스트 계정 생성**
   ```
   이메일: test-webhook-1234567890@example.com
   비밀번호: Test1234!
   ```

4. **3개 위치 동시 확인**

   **① Vercel 로그 (터미널)**
   ```bash
   vercel logs --follow
   # user.created 이벤트 로그 확인
   ```

   **② Clerk Dashboard**
   ```
   Users → 새 사용자 생성 확인
   Webhooks → Logs → 200 OK 응답 확인
   ```

   **③ Supabase Dashboard**
   ```
   Table Editor → users 테이블 → 새 레코드 확인
   ```

### 방법 3: 사용자 정보 업데이트 테스트

1. **Clerk Dashboard → Users → 테스트 계정 선택**

2. **정보 변경**
   - First name 또는 Last name 수정
   - Profile image 변경

3. **Save 클릭**

4. **로그 확인**
   ```bash
   vercel logs --follow | grep "user.updated"
   ```

5. **Supabase 확인**
   ```sql
   SELECT * FROM users WHERE email = 'test@example.com';
   ```

### 방법 4: 사용자 삭제 테스트

1. **Clerk Dashboard → Users → 테스트 계정 선택**

2. **Delete user 클릭**

3. **로그 확인**
   ```bash
   vercel logs --follow | grep "user.deleted"
   ```

4. **Supabase 확인**
   ```sql
   SELECT * FROM users WHERE id = 'user_xxxxx';
   -- 결과: 0 rows (삭제 확인)
   ```

---

## 문제 해결 가이드

### 1단계 실패: Svix 헤더 누락

**증상:**
```
❌ [abc12345] 1단계 실패: Svix 헤더 누락
```

**해결 방법:**

1. **Clerk 웹훅 설정 확인**
   ```
   Clerk Dashboard → Webhooks
   ```

2. **엔드포인트 URL 확인**
   ```
   ✅ 올바른 예시: https://your-domain.vercel.app/api/webhooks/clerk
   ❌ 잘못된 예시: http://localhost:3000/api/webhooks/clerk
   ```

3. **이벤트 활성화 확인**
   ```
   ☑ user.created
   ☑ user.updated
   ☑ user.deleted
   ```

4. **테스트 이벤트 전송**
   ```
   Testing 탭 → Send Example
   ```

### 3단계 실패: 서명 검증 실패

**증상:**
```
❌ [abc12345] 3단계 실패: 서명 검증 실패
```

**해결 방법:**

1. **Clerk Signing Secret 복사**
   ```
   Clerk Dashboard → Webhooks → 엔드포인트 → Signing Secret
   예: whsec_uwGZDQ9tTxXWvBK24DsyygjenQCyRyOC
   ```

2. **Vercel 환경 변수 확인**
   ```
   Vercel Dashboard → 프로젝트 → Settings → Environment Variables

   변수 이름: CLERK_WEBHOOK_SECRET
   값: whsec_uwGZDQ9tTxXWvBK24DsyygjenQCyRyOC (위에서 복사한 값)
   Environment: Production (또는 모든 환경)
   ```

3. **환경 변수 저장 후 재배포**
   ```bash
   # Vercel에서 자동 배포되거나
   # 수동으로 재배포
   vercel --prod
   ```

4. **헬스체크로 확인**
   ```bash
   curl https://your-domain.vercel.app/api/webhooks/clerk

   # webhookSecretPrefix가 "whsec_"로 시작하는지 확인
   ```

### 4단계 실패: 이벤트 형식 검증 실패

**증상:**
```
❌ [abc12345] 4단계 실패: 이벤트 형식 검증 실패
```

**해결 방법:**

1. **로그에서 Zod 에러 확인**
   ```
   - Zod 에러: {
       "type": { "_errors": ["Invalid enum value"] }
     }
   ```

2. **스키마 확인**
   ```typescript
   // src/features/auth/backend/schema.ts
   export const ClerkWebhookEventSchema = z.object({
     type: z.enum(['user.created', 'user.updated', 'user.deleted']),
     ...
   });
   ```

3. **Clerk에서 보낸 실제 이벤트 타입 확인**
   ```
   Clerk Dashboard → Webhooks → Logs → 해당 요청 → Payload
   ```

4. **필요시 스키마 업데이트**

### 6단계 실패: Supabase 작업 실패

**증상:**
```
❌ [abc12345] 6-A 실패: 사용자 생성 실패
   - 에러 코드: USER_CREATE_ERROR
   - 에러 메시지: Failed to create user: ...
```

**해결 방법:**

1. **Supabase 연결 확인**
   ```bash
   # 헬스체크로 환경 변수 확인
   curl https://your-domain.vercel.app/api/webhooks/clerk

   # hasSupabaseUrl: true
   # hasSupabaseServiceKey: true
   ```

2. **users 테이블 존재 확인**
   ```
   Supabase Dashboard → Table Editor → users 테이블 확인
   ```

3. **테이블이 없다면 migration 실행**
   ```sql
   -- Supabase Dashboard → SQL Editor
   -- supabase/migrations/ 디렉토리의 마이그레이션 파일 실행
   ```

4. **Supabase API 로그 확인**
   ```
   Supabase Dashboard → Logs → API
   ```

5. **일반적인 에러와 해결:**

   **에러: duplicate key value**
   ```
   원인: 이미 존재하는 사용자 ID
   해결: Clerk에서 해당 사용자 삭제 후 재생성
   ```

   **에러: violates not-null constraint**
   ```
   원인: 필수 필드(email) 누락
   해결: Clerk 사용자 정보에 이메일이 있는지 확인
   ```

   **에러: permission denied**
   ```
   원인: RLS 정책 또는 Service Role Key 문제
   해결:
   1. RLS 비활성화 확인: ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   2. SUPABASE_SERVICE_ROLE_KEY 재확인
   ```

### Vercel 배포 문제

**증상:**
- 웹훅이 전혀 동작하지 않음
- 헬스체크도 응답 없음

**해결 방법:**

1. **배포 상태 확인**
   ```bash
   vercel ls
   # Production 도메인과 상태 확인
   ```

2. **최신 배포 확인**
   ```
   Vercel Dashboard → Deployments → Production 상태 확인
   ```

3. **빌드 에러 확인**
   ```
   Vercel Dashboard → Deployments → 최근 배포 → Build Logs
   ```

4. **환경 변수 재확인 후 재배포**
   ```bash
   git push origin main
   # 또는
   vercel --prod
   ```

---

## 참고 자료

### 관련 파일

- **웹훅 엔드포인트**: `src/app/api/webhooks/clerk/route.ts`
- **이벤트 스키마**: `src/features/auth/backend/schema.ts`
- **Supabase 서비스**: `src/features/auth/backend/service.ts`
- **에러 코드**: `src/features/auth/backend/error.ts`

### 외부 문서

- [Clerk 웹훅 설정 가이드](./external/clerk.md)
- [Clerk 공식 문서 - Webhooks](https://clerk.com/docs/webhooks)
- [Supabase 공식 문서](https://supabase.com/docs)
- [Vercel 로그 문서](https://vercel.com/docs/observability/logs)

### 유용한 명령어

```bash
# Vercel 실시간 로그
vercel logs --follow

# 웹훅 로그만 필터
vercel logs --follow | grep -E "Webhook|단계"

# 에러만 확인
vercel logs --follow | grep "❌"

# 헬스체크
curl https://your-domain.vercel.app/api/webhooks/clerk

# Supabase 사용자 확인
# Supabase Dashboard → SQL Editor
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

---

## 문의

디버깅 중 해결되지 않는 문제가 있다면:

1. 위의 로그를 복사해서 저장
2. Clerk Dashboard의 웹훅 로그 스크린샷
3. Supabase 에러 로그 스크린샷

위 정보와 함께 문의하시면 빠른 해결이 가능합니다.

# 005 기능 배포 가이드

## 개요

정기 결제 및 구독 만료 처리 자동화 시스템 배포 가이드입니다.

---

## 환경변수 설정

### `.env.local` 파일에 추가

다음 환경변수를 `.env.local` 파일에 추가하세요:

```env
# 토스 페이먼츠 Secret Key (서버 전용)
TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase Cron Secret Token (랜덤 생성 권장, 최소 32자)
CRON_SECRET_TOKEN=your-random-secret-token-here-minimum-32-characters
```

**주의사항**:
- `TOSS_SECRET_KEY`는 토스 페이먼츠 개발자센터에서 발급받은 Secret Key를 사용하세요.
  - 테스트 환경: `test_sk_` 접두사
  - 프로덕션 환경: `live_sk_` 접두사
- `CRON_SECRET_TOKEN`은 충분히 복잡한 랜덤 문자열로 설정하세요 (최소 32자 권장).
  - 예시 생성 방법: `openssl rand -base64 32`
- Supabase Cron SQL에서도 동일한 `CRON_SECRET_TOKEN` 값을 사용해야 합니다.

---

## Supabase 마이그레이션 실행

### 1. cron_execution_log 테이블 생성

Supabase Dashboard → SQL Editor에서 다음 마이그레이션 파일을 실행하세요:

```bash
supabase/migrations/20250126000004_create_cron_execution_log.sql
```

**확인 방법**:
```sql
SELECT * FROM public.cron_execution_log LIMIT 1;
```

### 2. Supabase Cron 설정

Supabase Dashboard → SQL Editor에서 다음 마이그레이션 파일을 실행하세요:

```bash
supabase/migrations/20250126000005_setup_cron_jobs.sql
```

**⚠️ 주의**: 파일 내의 다음 값들을 실제 값으로 변경해야 합니다:
1. `https://your-domain.com` → 실제 배포된 도메인 (예: `https://vmc006.vercel.app`)
2. `your-cron-secret-token-here` → `.env.local`의 `CRON_SECRET_TOKEN`과 동일한 값

**확인 방법**:
```sql
-- Cron Job 목록 조회
SELECT * FROM cron.job;

-- Cron Job 실행 이력 조회
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## 배포 체크리스트

### 개발 환경

- [ ] `.env.local`에 `TOSS_SECRET_KEY` 설정 완료
- [ ] `.env.local`에 `CRON_SECRET_TOKEN` 설정 완료
- [ ] `supabase/migrations/20250126000004_create_cron_execution_log.sql` 실행 완료
- [ ] `supabase/migrations/20250126000005_setup_cron_jobs.sql` 실행 완료
  - [ ] URL을 로컬 도메인으로 변경 (예: `http://localhost:3000`)
  - [ ] Secret Token을 `.env.local`의 값과 동일하게 변경
- [ ] `src/features/subscription/backend/` 모듈 생성 완료
  - [ ] `tossPayments.ts`
  - [ ] `cronError.ts`
  - [ ] `cronSchema.ts`
  - [ ] `cronService.ts`
- [ ] `src/features/subscription/backend/route.ts` 수정 완료
- [ ] 로컬 서버 실행 후 타입 에러 없음 확인
- [ ] 빌드 성공 확인: `npm run build`

### 프로덕션 환경

- [ ] 환경변수 `TOSS_SECRET_KEY` (live 키로 변경)
- [ ] 환경변수 `CRON_SECRET_TOKEN` 설정
- [ ] Supabase Cron URL을 프로덕션 도메인으로 변경
- [ ] Supabase `pg_cron`, `pg_net` 확장 활성화 확인
- [ ] Cron Job 스케줄 확인 (`SELECT * FROM cron.job;`)
- [ ] 정기결제 로그 모니터링 설정 (선택사항)

---

## 로컬 테스트 가이드

### Step 1: 테스트 데이터 준비

Supabase에서 테스트용 구독 데이터를 생성하세요:

```sql
-- 오늘이 결제일인 활성 구독 생성
INSERT INTO public.subscriptions (
  user_id,
  customer_key,
  billing_key,
  card_company,
  card_number,
  status,
  next_billing_date
)
VALUES (
  'user_test_123',
  'test-customer-key',
  'test-billing-key',
  '신한카드',
  '433012******1234',
  'active',
  CURRENT_DATE
);
```

### Step 2: 정기결제 Cron API 수동 호출

```bash
curl -X POST http://localhost:3000/api/subscription/billing/cron \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: your-cron-secret-token-here" \
  -d '{"timestamp": "2025-01-26T02:00:00Z"}'
```

**예상 응답** (성공 시):
```json
{
  "processedCount": 1,
  "successCount": 0,
  "failureCount": 1,
  "results": [
    {
      "userId": "user_test_123",
      "subscriptionId": "uuid-1",
      "status": "failed",
      "errorCode": "PAYMENT_FAILED",
      "errorMessage": "토스 페이먼츠 결제 실패"
    }
  ],
  "executionTimeMs": 234
}
```

**주의**: 테스트 빌링키로는 실제 결제가 불가능하므로 실패 응답이 정상입니다.

### Step 3: 구독 만료 Cron API 수동 호출

먼저 테스트 데이터를 준비하세요:

```sql
-- 만료일이 오늘인 취소된 구독 생성
UPDATE public.subscriptions
SET status = 'cancelled', next_billing_date = CURRENT_DATE
WHERE user_id = 'user_test_123';
```

그 다음 API를 호출하세요:

```bash
curl -X POST http://localhost:3000/api/subscription/expire/cron \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: your-cron-secret-token-here" \
  -d '{"timestamp": "2025-01-26T03:00:00Z"}'
```

**예상 응답** (성공 시):
```json
{
  "expiredCount": 1,
  "results": [
    {
      "userId": "user_test_123",
      "subscriptionId": "uuid-1",
      "expiredDate": "2025-01-26",
      "newTier": "free",
      "newRemainingTests": 0
    }
  ],
  "executionTimeMs": 123
}
```

### Step 4: 결과 확인

다음 테이블들을 확인하세요:

**1. cron_execution_log**
```sql
SELECT * FROM public.cron_execution_log
ORDER BY created_at DESC
LIMIT 5;
```

**2. payments**
```sql
SELECT * FROM public.payments
ORDER BY created_at DESC
LIMIT 5;
```

**3. subscriptions**
```sql
SELECT id, user_id, status, next_billing_date
FROM public.subscriptions
WHERE user_id = 'user_test_123';
```

**4. users**
```sql
SELECT id, subscription_tier, remaining_tests
FROM public.users
WHERE id = 'user_test_123';
```

---

## 프로덕션 테스트 가이드

### Step 1: Supabase Cron Job 실행 확인

```sql
-- Cron Job 목록 조회
SELECT * FROM cron.job;

-- Cron Job 실행 이력 조회
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Step 2: 수동으로 즉시 실행 (테스트 목적)

```sql
-- 정기결제 Cron Job 즉시 실행
SELECT net.http_post(
  url := 'https://vmc006.vercel.app/api/subscription/billing/cron',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'X-Cron-Secret', 'your-cron-secret-token-here'
  ),
  body := jsonb_build_object('timestamp', now())
) AS request_id;
```

### Step 3: 로그 모니터링

**1. cron_execution_log 테이블 확인**
```sql
SELECT
  job_name,
  execution_date,
  status,
  processed_count,
  success_count,
  failure_count,
  execution_time_ms,
  error_message,
  created_at
FROM public.cron_execution_log
ORDER BY created_at DESC
LIMIT 10;
```

**2. payments 테이블에서 결제 성공/실패 비율 확인**
```sql
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM public.payments
WHERE method = 'cron_auto_billing'
  AND DATE(created_at) = CURRENT_DATE
GROUP BY status;
```

---

## 문제 해결 (Troubleshooting)

### 1. Cron Job이 실행되지 않음

**원인**: `pg_cron` 또는 `pg_net` 확장이 활성화되지 않음

**해결 방법**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. 401 Unauthorized 에러

**원인**: `X-Cron-Secret` 헤더가 일치하지 않음

**해결 방법**:
- Supabase Cron SQL의 Secret Token을 `.env.local`의 `CRON_SECRET_TOKEN`과 동일하게 변경
- 환경변수가 제대로 로드되었는지 확인

### 3. 중복 실행 방지 에러 (409 Conflict)

**원인**: 같은 날짜에 이미 실행된 기록이 있음

**해결 방법**:
- 정상적인 동작입니다. 다음 날 다시 실행됩니다.
- 테스트를 위해 강제로 재실행하려면:
  ```sql
  DELETE FROM public.cron_execution_log
  WHERE execution_date = CURRENT_DATE;
  ```

### 4. 토스 페이먼츠 결제 실패

**원인**:
- 빌링키가 만료됨
- 카드 잔액 부족
- 토스 페이먼츠 API 오류

**해결 방법**:
- `payments` 테이블의 `error_message` 확인
- 토스 페이먼츠 개발자센터에서 결제 이력 확인

### 5. Supabase Cron 타임아웃

**원인**: 처리할 구독 건수가 많아서 30초를 초과함

**해결 방법**:
- `timeout_milliseconds`를 60000 (60초)로 증가
- 또는 배치 처리 로직 도입

---

## 모니터링 및 알림 (선택사항)

### Slack 알림 설정

정기결제 실패 시 Slack으로 알림을 받으려면 다음을 추가하세요:

1. Slack Webhook URL 발급
2. 환경변수에 추가: `SLACK_WEBHOOK_URL=https://hooks.slack.com/...`
3. `cronService.ts`에서 실패 시 Slack 알림 발송

---

## 추가 참고 자료

- [Supabase Cron 공식 문서](https://supabase.com/docs/guides/cron)
- [토스 페이먼츠 빌링 API 문서](https://docs.tosspayments.com/guides/v2/billing)
- [pg_cron GitHub](https://github.com/citusdata/pg_cron)

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-01-26

-- Supabase Cron Job 설정
-- pg_cron 및 pg_net 확장을 이용한 정기 작업 스케줄링

-- 1. 필요한 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 정기결제 Cron Job 설정
-- 매일 02:00 KST (UTC 기준 전날 17:00)에 정기결제 트리거
-- ⚠️ 주의: 아래 URL과 Secret Token을 실제 값으로 변경해야 합니다.
SELECT cron.schedule(
  'recurring-payment-trigger',
  '0 17 * * *', -- UTC 17:00 = KST 다음날 02:00 (한국 시간 기준)
  $$
  SELECT net.http_post(
    url := 'https://vmc006.vercel.app/api/subscription/billing/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', 'a8f3c2e9d7b4f1a6e5c8d2b9f7a3e1c4d8b6f2a9e7c5d3b1f8a6e4c2d9b7f5a3'
    ),
    body := jsonb_build_object('timestamp', now()),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- 3. 구독 만료 처리 Cron Job 설정
-- 매일 03:00 KST (UTC 기준 전날 18:00)에 구독 만료 처리 트리거
-- ⚠️ 주의: 아래 URL과 Secret Token을 실제 값으로 변경해야 합니다.
SELECT cron.schedule(
  'subscription-expire-trigger',
  '0 18 * * *', -- UTC 18:00 = KST 다음날 03:00 (한국 시간 기준)
  $$
  SELECT net.http_post(
    url := 'https://your-domain.com/api/subscription/expire/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', 'your-cron-secret-token-here'
    ),
    body := jsonb_build_object('timestamp', now()),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- 4. Cron Job 목록 확인
-- SELECT * FROM cron.job;

-- 5. Cron Job 실행 이력 확인
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- ⚠️ 배포 전 체크리스트:
-- 1. 위 SQL의 'https://your-domain.com'을 실제 배포된 도메인으로 변경
-- 2. 'your-cron-secret-token-here'를 환경변수 CRON_SECRET_TOKEN과 동일한 값으로 변경
-- 3. 타임존 확인: Supabase Cron은 UTC 기준, 한국 시간(KST)은 UTC+9
-- 4. timeout_milliseconds는 최대 30000ms(30초) 권장

-- Cron Job 삭제 방법 (필요 시):
-- SELECT cron.unschedule('recurring-payment-trigger');
-- SELECT cron.unschedule('subscription-expire-trigger');

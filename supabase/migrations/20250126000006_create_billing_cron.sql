-- Supabase Cron Job 설정
-- 매일 02:00 (한국 시간)에 정기결제 트리거
-- UTC 시간으로는 전날 17:00 (UTC+9 고려)

-- pg_cron과 pg_net 익스텐션이 활성화되어 있는지 확인 (Supabase Dashboard에서 수동 활성화 필요)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 스케줄이 있으면 삭제 (없으면 무시)
DO $$
BEGIN
  PERFORM cron.unschedule('recurring-payment-trigger');
EXCEPTION
  WHEN OTHERS THEN
    -- 스케줄이 없으면 무시
    NULL;
END $$;

-- 매일 UTC 17:00 (한국 시간 다음날 02:00)에 정기결제 API 호출
SELECT cron.schedule(
  job_name := 'recurring-payment-trigger',
  schedule := '0 17 * * *',  -- 매일 UTC 17:00
  command := $$
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

-- 주의사항:
-- 1. ✅ URL이 'https://vmc006.vercel.app'로 설정되어 있습니다.
-- 2. ✅ X-Cron-Secret이 환경변수 CRON_SECRET_TOKEN 값과 일치하도록 설정되어 있습니다.
-- 3. ⚠️  pg_cron과 pg_net 익스텐션은 Supabase Dashboard에서 수동으로 활성화해야 합니다.
--    (Database -> Extensions 메뉴에서 활성화)

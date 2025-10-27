-- Cron 실행 로그 테이블 생성
-- 중복 실행 방지 및 실행 이력 관리를 위한 테이블

CREATE TABLE IF NOT EXISTS public.cron_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  execution_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(job_name, execution_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cron_execution_log_job_name ON public.cron_execution_log(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_execution_log_execution_date ON public.cron_execution_log(execution_date);
CREATE INDEX IF NOT EXISTS idx_cron_execution_log_status ON public.cron_execution_log(status);

-- 코멘트 추가
COMMENT ON TABLE public.cron_execution_log IS 'Cron Job 실행 이력 및 중복 실행 방지를 위한 테이블';
COMMENT ON COLUMN public.cron_execution_log.job_name IS 'Cron Job 이름 (예: recurring-payment-trigger, subscription-expire-trigger)';
COMMENT ON COLUMN public.cron_execution_log.execution_date IS '실행 날짜 (중복 방지용)';
COMMENT ON COLUMN public.cron_execution_log.status IS '실행 상태: running(실행중), completed(완료), failed(실패)';
COMMENT ON COLUMN public.cron_execution_log.processed_count IS '처리된 총 건수';
COMMENT ON COLUMN public.cron_execution_log.success_count IS '성공 건수';
COMMENT ON COLUMN public.cron_execution_log.failure_count IS '실패 건수';
COMMENT ON COLUMN public.cron_execution_log.error_message IS '실패 시 에러 메시지';
COMMENT ON COLUMN public.cron_execution_log.execution_time_ms IS '실행 시간 (밀리초)';
COMMENT ON COLUMN public.cron_execution_log.completed_at IS '완료 시각';

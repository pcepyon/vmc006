-- Payments 테이블 생성
-- 결제 내역 기록
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 결제 ID
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- 사용자 ID
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL, -- 구독 ID
  payment_key TEXT,                              -- 토스 결제키 (정기결제에는 없을 수 있음)
  order_id TEXT NOT NULL UNIQUE,                 -- 주문번호 (가맹점에서 생성)
  amount INTEGER NOT NULL,                       -- 결제 금액 (원 단위)
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'CANCELLED')), -- 결제 상태
  method TEXT DEFAULT 'billing',                 -- 결제 방식 (billing: 정기결제)
  error_code TEXT,                              -- 실패 시 에러코드
  error_message TEXT,                           -- 실패 시 에러메시지
  paid_at TIMESTAMP WITH TIME ZONE,             -- 결제 완료 시각
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- 생성 시각
);

-- 인덱스 생성
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_paid_at ON public.payments(paid_at DESC);

-- 복합 인덱스 (사용자별 결제 내역 조회 최적화)
CREATE INDEX idx_payments_user_id_created_at ON public.payments(user_id, created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE public.payments IS '결제 내역 기록';
COMMENT ON COLUMN public.payments.payment_key IS '토스 페이먼츠 결제키';
COMMENT ON COLUMN public.payments.order_id IS '주문번호 (ORDER-{user_id}-{timestamp} 형식)';
COMMENT ON COLUMN public.payments.amount IS '결제 금액 (원 단위)';
COMMENT ON COLUMN public.payments.status IS '결제 상태 (SUCCESS: 성공, FAILED: 실패, CANCELLED: 취소)';
COMMENT ON COLUMN public.payments.method IS '결제 방식 (billing: 정기결제)';
COMMENT ON COLUMN public.payments.error_code IS '결제 실패 시 토스 페이먼츠 에러코드';
COMMENT ON COLUMN public.payments.error_message IS '결제 실패 시 에러메시지';
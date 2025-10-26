-- Subscriptions 테이블 생성
-- Pro 요금제 구독 정보
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 구독 ID
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- 사용자 ID
  customer_key TEXT UNIQUE,                     -- 토스 Customer Key (UUID) - 해지 시 NULL 처리
  billing_key TEXT,                              -- 토스 빌링키 - 해지 시 NULL 처리
  card_company TEXT,                            -- 카드사 (예: 신한카드)
  card_number TEXT,                             -- 마스킹된 카드번호 (예: 433012******1234)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')), -- 구독 상태
  next_billing_date DATE,                       -- 다음 결제일 - expired 상태에서는 NULL 가능
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 구독 시작일
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 수정 시각
  UNIQUE(user_id)                               -- 한 명당 하나의 구독만 가능
);

-- 인덱스 생성
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing_date ON public.subscriptions(next_billing_date);

-- 복합 인덱스 (정기결제 대상 조회 최적화)
CREATE INDEX idx_subscriptions_status_next_billing_date ON public.subscriptions(status, next_billing_date)
WHERE status = 'active';

-- 코멘트 추가
COMMENT ON TABLE public.subscriptions IS 'Pro 요금제 구독 정보';
COMMENT ON COLUMN public.subscriptions.customer_key IS '토스 페이먼츠 Customer Key (구독 해지 시 NULL로 설정)';
COMMENT ON COLUMN public.subscriptions.billing_key IS '토스 페이먼츠 빌링키 (구독 해지 시 NULL로 설정하여 재사용 방지)';
COMMENT ON COLUMN public.subscriptions.status IS '구독 상태 (active: 활성, cancelled: 해지예정, expired: 만료)';
COMMENT ON COLUMN public.subscriptions.next_billing_date IS '다음 자동결제 예정일 (expired 상태에서는 NULL)';

-- updated_at 트리거
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
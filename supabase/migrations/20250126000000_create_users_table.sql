-- Users 테이블 생성
-- Clerk 인증 시스템과 연동되는 사용자 정보
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,                          -- Clerk User ID (예: user_xxxxxxxxxxxxx)
  email TEXT NOT NULL UNIQUE,                   -- 사용자 이메일
  name TEXT,                                     -- 사용자 이름
  profile_image_url TEXT,                        -- 프로필 이미지 URL
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')), -- 구독 등급
  remaining_tests INTEGER DEFAULT 3,            -- 잔여 검사 횟수
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 생성 시각
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- 수정 시각
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription_tier ON public.users(subscription_tier);

-- 코멘트 추가
COMMENT ON TABLE public.users IS 'Clerk 인증 시스템과 연동되는 사용자 정보';
COMMENT ON COLUMN public.users.id IS 'Clerk User ID (user_로 시작)';
COMMENT ON COLUMN public.users.subscription_tier IS '구독 등급 (free: 무료, pro: 유료)';
COMMENT ON COLUMN public.users.remaining_tests IS '이번 달 잔여 검사 횟수';

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
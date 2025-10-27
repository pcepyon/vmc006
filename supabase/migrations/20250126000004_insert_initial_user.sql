-- 초기 사용자 데이터 삽입
-- pcepyon@gmail.com 사용자 생성

BEGIN;

-- 사용자 삽입 (이미 존재하면 무시)
INSERT INTO public.users (
  id,
  email,
  name,
  subscription_tier,
  remaining_tests
)
VALUES (
  'user_' || replace(gen_random_uuid()::text, '-', ''), -- Clerk 형식의 User ID 생성
  'pcepyon@gmail.com',
  'PCE Pyon',
  'free',
  3
)
ON CONFLICT (email) DO NOTHING; -- 이미 존재하는 이메일이면 무시 (idempotent)

COMMIT;

-- 결과 확인
COMMENT ON TABLE public.users IS '초기 사용자(pcepyon@gmail.com) 추가 완료';

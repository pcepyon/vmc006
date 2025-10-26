-- Saju Tests 테이블 생성
-- 사주 검사 결과 저장
CREATE TABLE IF NOT EXISTS public.saju_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- 검사 ID
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- 사용자 ID
  test_name TEXT NOT NULL,                      -- 검사 대상자 이름
  birth_date DATE NOT NULL,                     -- 생년월일
  birth_time TIME,                              -- 출생시간 (NULL = 모름)
  is_birth_time_unknown BOOLEAN DEFAULT FALSE,  -- 출생시간 모름 여부
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')), -- 성별
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')), -- 검사 상태
  ai_model TEXT NOT NULL,                       -- 사용된 AI 모델 (gemini-2.5-flash, gemini-2.5-pro)
  summary_result TEXT,                          -- AI 분석 요약 (모달용)
  full_result TEXT,                             -- AI 분석 전체 결과
  error_message TEXT,                           -- 실패 시 에러 메시지
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 검사 시작 시각
  completed_at TIMESTAMP WITH TIME ZONE         -- 검사 완료 시각
);

-- 인덱스 생성
CREATE INDEX idx_saju_tests_user_id ON public.saju_tests(user_id);
CREATE INDEX idx_saju_tests_test_name ON public.saju_tests(test_name);
CREATE INDEX idx_saju_tests_created_at ON public.saju_tests(created_at DESC);
CREATE INDEX idx_saju_tests_status ON public.saju_tests(status);

-- 복합 인덱스 (사용자별 검사 이력 조회 최적화)
CREATE INDEX idx_saju_tests_user_id_created_at ON public.saju_tests(user_id, created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE public.saju_tests IS '사주 검사 결과 저장';
COMMENT ON COLUMN public.saju_tests.test_name IS '검사 대상자 이름 (검색 가능)';
COMMENT ON COLUMN public.saju_tests.birth_time IS '출생시간 (NULL인 경우 출생시간 모름)';
COMMENT ON COLUMN public.saju_tests.status IS '검사 상태 (processing: 진행중, completed: 완료, failed: 실패)';
COMMENT ON COLUMN public.saju_tests.ai_model IS '사용된 Gemini 모델 (무료: gemini-2.5-flash, Pro: gemini-2.5-pro)';
COMMENT ON COLUMN public.saju_tests.summary_result IS '모달에 표시할 요약 결과';
COMMENT ON COLUMN public.saju_tests.full_result IS '상세 페이지에 표시할 전체 결과';
/**
 * Vitest 전역 설정
 *
 * 모든 테스트 실행 전에 실행되는 설정 파일입니다.
 */

import { vi } from 'vitest'

// 환경 변수 설정
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock'
process.env.CLERK_SECRET_KEY = 'sk_test_mock'
process.env.SUPABASE_URL = 'https://mock.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock_anon_key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_role_key'
process.env.GEMINI_API_KEY = 'mock_gemini_key'
process.env.TOSS_SECRET_KEY = 'mock_toss_secret'
process.env.TOSS_CLIENT_KEY = 'test_ck_mock'

// 전역 타임아웃 설정
vi.setConfig({ testTimeout: 10000 })

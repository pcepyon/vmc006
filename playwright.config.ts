import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 테스트 설정
 *
 * 모든 테스트는 Mocked Backend를 사용하여 외부 API 의존성을 제거합니다.
 */
export default defineConfig({
  testDir: './src/test/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // 이미 실행 중인 서버가 있으면 재사용
    timeout: 120 * 1000,
    stdout: 'ignore', // 개발 서버 로그 숨김
    stderr: 'pipe',
  },
})

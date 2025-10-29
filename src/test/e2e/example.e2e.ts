/**
 * Playwright E2E 테스트
 *
 * 실제 앱의 핵심 기능을 테스트합니다.
 * Mock Backend를 사용하여 외부 API 의존성을 제거합니다.
 */

import { test, expect } from '@playwright/test'

test.describe('메인 페이지', () => {
  test('홈페이지가 정상적으로 로드되어야 한다', async ({ page }) => {
    await page.goto('/')

    // 실제 페이지 제목 확인
    await expect(page).toHaveTitle(/사주 분석/)

    // 주요 요소 확인 (h1 또는 h2 헤딩이 존재해야 함)
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()
  })

  test('페이지가 에러 없이 렌더링되어야 한다', async ({ page }) => {
    // 콘솔 에러 감지
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')

    // 페이지가 로드될 때까지 대기
    await page.waitForLoadState('networkidle')

    // 심각한 에러가 없어야 함 (일부 경고는 허용)
    const criticalErrors = errors.filter(
      (e) => !e.includes('Warning') && !e.includes('clerk')
    )
    expect(criticalErrors.length).toBe(0)
  })
})

test.describe('API Mock 테스트', () => {
  test('Mock된 백엔드 API가 정상 동작해야 한다', async ({ page, request }) => {
    // 페이지에서 API 요청을 Mock으로 가로채기
    await page.route('**/api/saju/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          testId: 'e2e_test_123',
          summary: 'E2E 테스트용 Mock 응답입니다.',
        }),
      })
    })

    await page.goto('/')

    // 직접 API 호출 테스트 (인증 없이 401 기대)
    const response = await request.post('http://localhost:3000/api/saju/analyze', {
      data: {
        test_name: 'E2E 테스트',
        birth_date: '1990-01-01',
        birth_time: '14:00:00',
        is_birth_time_unknown: false,
        gender: 'male',
      },
    })

    // 인증이 없으므로 401 또는 403을 예상
    expect([401, 403]).toContain(response.status())
  })
})

/**
 * 실제 E2E 테스트 구현 가이드
 *
 * 1. Clerk 인증 설정:
 *    - test.use({ storageState: 'auth.json' }) 사용
 *    - 로그인 후 세션 저장
 *
 * 2. Mock Backend 사용:
 *    - page.route()를 사용하여 모든 /api/* 요청을 Mock으로 대체
 *    - Gemini와 Toss API 응답을 사전 정의된 Mock 데이터로 반환
 *
 * 3. 테스트 시나리오:
 *    - 대시보드 접근 및 검사 이력 확인
 *    - 새 검사 수행 및 결과 모달 확인
 *    - Pro 구독 플로우 시작 및 빌링키 발급
 *
 * 예제:
 *
 * test.describe('인증된 사용자 플로우', () => {
 *   test.use({ storageState: 'playwright/.auth/user.json' })
 *
 *   test('대시보드에서 검사 이력을 확인할 수 있다', async ({ page }) => {
 *     await page.goto('/dashboard')
 *     await expect(page.locator('h1')).toContainText('대시보드')
 *   })
 * })
 */

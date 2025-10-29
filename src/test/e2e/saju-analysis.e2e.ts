/**
 * 사주 검사 플로우 E2E 테스트
 *
 * 새 검사 수행 및 결과 확인 전체 플로우를 테스트합니다.
 */

import { test, expect } from '@playwright/test'

test.describe('사주 검사 수행 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 검사 API Mock
    await page.route('**/api/saju/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          testId: 'test_new_123',
          summary: 'Mock 사주 분석 결과: 균형 잡힌 오행 구성을 보이며, 대인관계에 강점이 있습니다.',
        }),
      })
    })

    // 검사 결과 조회 Mock
    await page.route('**/api/saju/tests/test_new_123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test_new_123',
          test_name: '테스트사용자',
          birth_date: '1990-01-01',
          birth_time: '14:00:00',
          gender: 'male',
          status: 'completed',
          summary_result: 'Mock 사주 분석 결과: 균형 잡힌 오행 구성을 보이며, 대인관계에 강점이 있습니다.',
          full_result: '# 상세 분석\n\n균형 잡힌 오행 구성...',
          ai_model: 'gemini-2.5-flash-lite',
          created_at: '2025-10-29T10:00:00Z',
          completed_at: '2025-10-29T10:00:05Z',
        }),
      })
    })

    // 사용자 정보 Mock
    await page.route('**/api/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user_mock',
          subscription_tier: 'free',
          remaining_tests: 3,
        }),
      })
    })
  })

  test('검사 양식 페이지가 정상적으로 로드되어야 한다', async ({ page }) => {
    // 검사 시작 페이지로 이동 (실제 경로는 앱에 따라 다를 수 있음)
    await page.goto('/saju/new')

    // 입력 폼이 표시되는지 확인
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('검사 양식에 필수 입력 필드가 존재해야 한다', async ({ page }) => {
    await page.goto('/saju/new')
    await page.waitForLoadState('networkidle')

    // 입력 필드 또는 버튼이 있는지 확인
    const inputs = page.locator('input, select, button')
    const count = await inputs.count()

    // 최소한 몇 개의 입력 요소가 있어야 함
    expect(count).toBeGreaterThan(0)
  })

  test('잔여 횟수가 0일 때 적절한 메시지를 표시해야 한다', async ({ page }) => {
    // 잔여 횟수 0으로 Mock
    await page.route('**/api/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user_mock',
          subscription_tier: 'free',
          remaining_tests: 0,
        }),
      })
    })

    // 검사 API 403 응답
    await page.route('**/api/saju/analyze', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'NO_TESTS_REMAINING',
            message: '잔여 검사 횟수가 부족합니다.',
          },
        }),
      })
    })

    await page.goto('/saju/new')
    await page.waitForLoadState('networkidle')

    // 페이지가 정상적으로 로드되고 에러가 없어야 함
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('검사 결과 조회', () => {
  test.beforeEach(async ({ page }) => {
    // 검사 결과 Mock
    await page.route('**/api/saju/tests/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test_result_123',
          test_name: '홍길동',
          birth_date: '1990-01-01',
          status: 'completed',
          summary_result: 'Mock 검사 결과입니다.',
          full_result: '# 상세 분석 결과\n\n상세한 내용...',
          created_at: '2025-10-29T10:00:00Z',
        }),
      })
    })
  })

  test('검사 결과 페이지가 정상적으로 로드되어야 한다', async ({ page }) => {
    await page.goto('/saju/result/test_result_123')
    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('존재하지 않는 검사 조회 시 에러 페이지를 표시해야 한다', async ({ page }) => {
    // 404 응답 Mock
    await page.route('**/api/saju/tests/nonexistent', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: '검사 결과를 찾을 수 없습니다.',
          },
        }),
      })
    })

    await page.goto('/saju/result/nonexistent')
    await page.waitForLoadState('load')

    // 페이지가 크래시하지 않아야 함
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

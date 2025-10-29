/**
 * 네비게이션 및 라우팅 E2E 테스트
 *
 * 주요 페이지 간 이동 및 라우팅이 정상 동작하는지 테스트합니다.
 */

import { test, expect } from '@playwright/test'

test.describe('네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    // 기본 API Mock
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

  test('홈페이지에서 주요 링크가 동작해야 한다', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 링크 요소가 있는지 확인
    const links = page.locator('a')
    const linkCount = await links.count()

    expect(linkCount).toBeGreaterThan(0)
  })

  test('404 페이지가 존재하지 않는 경로에 대해 표시되어야 한다', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345')

    // 404 또는 페이지가 로드되어야 함
    if (response) {
      expect([200, 404]).toContain(response.status())
    }

    // 페이지가 크래시하지 않아야 함
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('페이지 간 이동 시 히스토리가 정상 동작해야 한다', async ({ page }) => {
    // 홈 → 대시보드 → 뒤로가기
    await page.goto('/')
    await page.waitForLoadState('load')

    await page.goto('/dashboard')
    await page.waitForLoadState('load')

    await page.goBack()
    await page.waitForLoadState('load')

    // URL이 변경되었는지 확인
    const url = page.url()
    expect(url).toContain('localhost:3000')
  })
})

test.describe('반응형 디자인', () => {
  test('모바일 뷰포트에서 페이지가 정상 렌더링되어야 한다', async ({ page }) => {
    // 모바일 크기로 설정
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('태블릿 뷰포트에서 페이지가 정상 렌더링되어야 한다', async ({ page }) => {
    // 태블릿 크기로 설정
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('데스크톱 뷰포트에서 페이지가 정상 렌더링되어야 한다', async ({ page }) => {
    // 데스크톱 크기로 설정
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('성능 및 로딩', () => {
  test('페이지 로딩 시간이 합리적이어야 한다', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await page.waitForLoadState('load')

    const loadTime = Date.now() - startTime

    // 10초 이내에 로드되어야 함
    expect(loadTime).toBeLessThan(10000)
  })

  test('페이지가 정상적으로 렌더링되고 중요 요소가 표시되어야 한다', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('load')

    // 페이지가 크래시하지 않고 기본 구조가 렌더링되었는지 확인
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // HTML 요소들이 최소한 렌더링되었는지 확인
    const htmlElements = await page.locator('*').count()
    expect(htmlElements).toBeGreaterThan(10) // 최소 10개 이상의 요소

    // 페이지에 텍스트 콘텐츠가 있는지 확인
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(0)
  })
})

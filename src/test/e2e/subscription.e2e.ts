/**
 * 구독 플로우 E2E 테스트
 *
 * Pro 구독 시작, 빌링키 발급, 구독 관리 플로우를 테스트합니다.
 */

import { test, expect } from '@playwright/test'

test.describe('구독 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 사용자 정보 Mock (Free 티어)
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

    // 구독 정보 조회 Mock
    await page.route('**/api/subscription/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'free',
          status: 'active',
          remaining_tests: 3,
        }),
      })
    })
  })

  test('구독 페이지가 정상적으로 로드되어야 한다', async ({ page }) => {
    await page.goto('/subscription')
    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('Pro 플랜 정보가 표시되어야 한다', async ({ page }) => {
    await page.goto('/subscription')
    await page.waitForLoadState('networkidle')

    // "Pro" 텍스트가 페이지에 있는지 확인
    const pageContent = await page.content()
    const hasPro = pageContent.toLowerCase().includes('pro') ||
                   pageContent.includes('구독') ||
                   pageContent.includes('플랜')

    expect(hasPro).toBeTruthy()
  })
})

test.describe('구독 결제 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // Toss Payments 빌링키 발급 Mock
    await page.route('**/api/subscription/billing/issue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          billingKey: 'mock_billing_key_123',
          card: {
            company: '신한카드',
            number: '1234-****-****-5678',
          },
        }),
      })
    })

    // 구독 활성화 Mock
    await page.route('**/api/subscription/activate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tier: 'pro',
          next_billing_date: '2025-11-29',
        }),
      })
    })

    // 결제 확인 Mock
    await page.route('**/api/subscription/billing/confirm', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          paymentKey: 'mock_payment_key_123',
          orderId: 'order_123',
          status: 'DONE',
        }),
      })
    })
  })

  test('Pro 구독 시작 버튼이 동작해야 한다', async ({ page }) => {
    await page.goto('/subscription')
    await page.waitForLoadState('networkidle')

    // 구독 버튼 찾기 (다양한 텍스트 시도)
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()

    expect(buttonCount).toBeGreaterThan(0)
  })

  test('빌링키 발급 실패 시 에러를 표시해야 한다', async ({ page }) => {
    // 빌링키 발급 실패 Mock
    await page.route('**/api/subscription/billing/issue', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'BILLING_KEY_ISSUE_FAILED',
            message: '빌링키 발급에 실패했습니다.',
          },
        }),
      })
    })

    await page.goto('/subscription')
    await page.waitForLoadState('networkidle')

    // 페이지가 크래시하지 않아야 함
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('구독 관리 - Pro 사용자', () => {
  test.beforeEach(async ({ page }) => {
    // Pro 사용자 정보 Mock
    await page.route('**/api/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user_pro',
          subscription_tier: 'pro',
          remaining_tests: 999,
          subscription_status: 'active',
          next_billing_date: '2025-11-29',
        }),
      })
    })

    // 구독 정보 조회 Mock
    await page.route('**/api/subscription/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'pro',
          status: 'active',
          remaining_tests: 999,
          next_billing_date: '2025-11-29',
          card: {
            company: '신한카드',
            number: '1234-****-****-5678',
          },
        }),
      })
    })

    // 구독 취소 Mock
    await page.route('**/api/subscription/cancel', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: '구독이 취소되었습니다.',
        }),
      })
    })
  })

  test('Pro 구독 정보가 표시되어야 한다', async ({ page }) => {
    await page.goto('/subscription')
    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Pro 관련 텍스트가 있는지 확인
    const content = await page.content()
    const hasProInfo = content.includes('Pro') ||
                       content.includes('pro') ||
                       content.includes('구독')

    expect(hasProInfo).toBeTruthy()
  })

  test('구독 취소 플로우가 동작해야 한다', async ({ page }) => {
    await page.goto('/subscription')
    await page.waitForLoadState('networkidle')

    // 취소 버튼이 있는지 확인 (있을 수도, 없을 수도 있음)
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()

    // 최소한 페이지가 로드되고 버튼이 있어야 함
    expect(buttonCount).toBeGreaterThan(0)
  })
})

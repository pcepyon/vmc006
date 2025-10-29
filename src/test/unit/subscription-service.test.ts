/**
 * Subscription Service 단위 테스트
 *
 * Toss Payments API 호출을 Mocking하여 빌링키 발급 및 결제 로직을 검증합니다.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { issueBillingKey, chargeBilling } from '@/features/subscription/backend/toss-service'
import {
  setMockFetch,
  resetMockFetch,
} from '@/backend/http/fetch-wrapper'
import {
  createMockFetchForBillingKeySuccess,
  createMockFetchForBillingKeyFailure,
  createMockFetchForChargeSuccess,
  createMockFetchForChargeFailure,
  MOCK_TOSS_BILLING_KEY_SUCCESS,
  MOCK_TOSS_CHARGE_SUCCESS,
} from '@/test/mocks/toss.mock'

describe('Subscription Service - issueBillingKey', () => {
  afterEach(() => {
    resetMockFetch()
  })

  it('빌링키 발급 성공 시 billingKey와 card 정보를 반환해야 한다', async () => {
    setMockFetch(createMockFetchForBillingKeySuccess())

    const result = await issueBillingKey('mock_auth_key', 'customer_123')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.billingKey).toBe(MOCK_TOSS_BILLING_KEY_SUCCESS.billingKey)
      expect(result.data.card.company).toBe(MOCK_TOSS_BILLING_KEY_SUCCESS.card.company)
      expect(result.data.card.number).toBe(MOCK_TOSS_BILLING_KEY_SUCCESS.card.number)
    }
  })

  it('빌링키 발급 실패 시 에러를 반환해야 한다', async () => {
    setMockFetch(createMockFetchForBillingKeyFailure())

    const result = await issueBillingKey('invalid_auth_key', 'customer_123')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
      expect(result.error.code).toBeDefined()
    }
  })
})

describe('Subscription Service - chargeBilling', () => {
  afterEach(() => {
    resetMockFetch()
  })

  it('결제 성공 시 paymentKey와 orderId를 반환해야 한다', async () => {
    setMockFetch(createMockFetchForChargeSuccess())

    const result = await chargeBilling(
      'mock_billing_key',
      'customer_123',
      9900,
      'order_123',
      'Pro 구독'
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.paymentKey).toBe(MOCK_TOSS_CHARGE_SUCCESS.paymentKey)
      expect(result.data.orderId).toBe(MOCK_TOSS_CHARGE_SUCCESS.orderId)
      expect(result.data.status).toBe('DONE')
    }
  })

  it('결제 실패 시 에러를 반환해야 한다', async () => {
    setMockFetch(createMockFetchForChargeFailure())

    const result = await chargeBilling(
      'invalid_billing_key',
      'customer_123',
      9900,
      'order_123',
      'Pro 구독'
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
    }
  })
})

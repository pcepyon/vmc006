/**
 * Supabase Mock 클라이언트
 *
 * 테스트 환경에서 사용할 Supabase 클라이언트 Mock입니다.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface MockUser {
  id: string
  subscription_tier: string
  remaining_tests: number
  toss_billing_key?: string
  toss_customer_key?: string
  subscription_status?: string
  next_billing_date?: string
}

export interface MockSajuTest {
  id: string
  user_id: string
  test_name: string
  birth_date: string
  birth_time: string | null
  is_birth_time_unknown: boolean
  gender: string
  ai_model: string
  status: string
  summary_result?: string
  full_result?: string
  error_message?: string
  created_at: string
  completed_at?: string
}

/**
 * Mock 데이터 저장소
 */
export class MockSupabaseStore {
  users: Map<string, MockUser> = new Map()
  sajuTests: Map<string, MockSajuTest> = new Map()
  subscriptions: Map<string, any> = new Map()

  reset() {
    this.users.clear()
    this.sajuTests.clear()
    this.subscriptions.clear()
  }

  addUser(user: MockUser) {
    this.users.set(user.id, user)
  }

  addSajuTest(test: MockSajuTest) {
    this.sajuTests.set(test.id, test)
  }
}

export const mockStore = new MockSupabaseStore()

/**
 * Mock Supabase 클라이언트 생성
 */
export function createMockSupabaseClient(): Partial<SupabaseClient> {
  return {
    from: (table: string) => {
      if (table === 'users') {
        return createUsersQueryBuilder()
      }
      if (table === 'saju_tests') {
        return createSajuTestsQueryBuilder()
      }
      return {} as any
    },
  } as any
}

function createUsersQueryBuilder() {
  let whereClause: Record<string, any> = {}

  return {
    select: (columns = '*') => {
      const chainable = {
        eq: (column: string, value: any) => {
          whereClause[column] = value
          return {
            ...chainable,
            single: async () => {
              const users = Array.from(mockStore.users.values()).filter((user) => {
                return Object.entries(whereClause).every(([key, val]) => (user as any)[key] === val)
              })

              if (users.length === 0) {
                return {
                  data: null,
                  error: { code: 'PGRST116', message: 'User not found' },
                }
              }
              return { data: users[0], error: null }
            },
          }
        },
      }
      return chainable
    },
    update: (data: Partial<MockUser>) => ({
      eq: (column: string, value: string) => {
        if (column === 'id' && mockStore.users.has(value)) {
          const user = mockStore.users.get(value)!
          mockStore.users.set(value, { ...user, ...data })
          return Promise.resolve({ data: { ...user, ...data }, error: null })
        }
        return Promise.resolve({
          data: null,
          error: { message: 'User not found' },
        })
      },
    }),
  } as any
}

function createSajuTestsQueryBuilder() {
  let whereClause: Record<string, any> = {}
  let selectColumns = '*'
  let orderByColumn: string | null = null
  let orderAscending = true
  let rangeStart: number | null = null
  let rangeEnd: number | null = null
  let countOption: string | null = null

  const createChainableEq = () => {
    const chainable: any = {
      eq: (column: string, value: any) => {
        whereClause[column] = value
        return chainable
      },
      single: async () => {
        const tests = Array.from(mockStore.sajuTests.values()).filter((test) => {
          return Object.entries(whereClause).every(([key, val]) => (test as any)[key] === val)
        })

        if (tests.length === 0) {
          return {
            data: null,
            error: { code: 'PGRST116', message: 'Test not found' },
          }
        }
        return { data: tests[0], error: null }
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        orderByColumn = col
        orderAscending = opts?.ascending ?? true
        return {
          range: (start: number, end: number) => {
            rangeStart = start
            rangeEnd = end
            return executeQuery()
          },
        }
      },
      range: (start: number, end: number) => {
        rangeStart = start
        rangeEnd = end
        return executeQuery()
      },
    }
    return chainable
  }

  return {
    select: (columns = '*', options?: { count?: string }) => {
      selectColumns = columns
      if (options?.count) {
        countOption = options.count
      }
      return {
        eq: (column: string, value: any) => {
          whereClause[column] = value
          return createChainableEq()
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
          orderByColumn = col
          orderAscending = opts?.ascending ?? true
          return {
            range: (start: number, end: number) => {
              rangeStart = start
              rangeEnd = end
              return executeQuery()
            },
          }
        },
      }
    },
    insert: (data: Omit<MockSajuTest, 'id' | 'created_at'>) => ({
      select: () => ({
        single: async () => {
          const newTest: MockSajuTest = {
            ...data,
            id: `test_${Date.now()}`,
            created_at: new Date().toISOString(),
          } as MockSajuTest
          mockStore.addSajuTest(newTest)
          return { data: newTest, error: null }
        },
      }),
    }),
    update: (data: Partial<MockSajuTest>) => ({
      eq: (column: string, value: string) => {
        if (column === 'id' && mockStore.sajuTests.has(value)) {
          const test = mockStore.sajuTests.get(value)!
          const updated = { ...test, ...data }
          mockStore.sajuTests.set(value, updated)
          return Promise.resolve({ data: updated, error: null })
        }
        return Promise.resolve({
          data: null,
          error: { message: 'Test not found' },
        })
      },
    }),
  } as any

  async function executeQuery() {
    let tests = Array.from(mockStore.sajuTests.values()).filter((test) => {
      return Object.entries(whereClause).every(([key, val]) => (test as any)[key] === val)
    })

    if (orderByColumn) {
      tests.sort((a, b) => {
        const aVal = (a as any)[orderByColumn]
        const bVal = (b as any)[orderByColumn]
        if (aVal < bVal) return orderAscending ? -1 : 1
        if (aVal > bVal) return orderAscending ? 1 : -1
        return 0
      })
    }

    const total = tests.length

    if (rangeStart !== null && rangeEnd !== null) {
      tests = tests.slice(rangeStart, rangeEnd + 1)
    }

    return {
      data: tests,
      error: null,
      count: countOption ? total : null,
    }
  }
}

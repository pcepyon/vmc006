import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure } from '@/backend/http/response';
import type { HandlerResult } from '@/backend/http/response';
import { dashboardErrorCodes, type DashboardServiceError } from './error';
import {
  SajuTestRowSchema,
  UserInfoRowSchema,
  type TestHistoryResponse,
  type TestDetailResponse,
  type UserSubscription,
  type TestHistoryQuery,
} from './schema';

/**
 * 검사 이력 목록 조회 (페이지네이션 + 검색)
 */
export async function getTestHistory(
  supabase: SupabaseClient,
  params: TestHistoryQuery & { userId: string },
): Promise<HandlerResult<TestHistoryResponse, DashboardServiceError>> {
  const { userId, page, limit, search } = params;
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('saju_tests')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('test_name', `%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return failure(
        500,
        dashboardErrorCodes.testFetchError,
        '검사 이력을 조회하는 중 오류가 발생했습니다.',
        { dbError: error.message },
      );
    }

    const parsedTests = data.map((row) => {
      const parsed = SajuTestRowSchema.parse(row);
      return {
        id: parsed.id,
        test_name: parsed.test_name,
        birth_date: parsed.birth_date,
        gender: parsed.gender,
        status: parsed.status,
        created_at: parsed.created_at,
      };
    });

    const totalPages = Math.ceil((count || 0) / limit);

    return success({
      tests: parsedTests,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      },
      ...(search && { search_query: search }),
    });
  } catch (error) {
    return failure(
      500,
      dashboardErrorCodes.databaseError,
      '데이터베이스 조회 중 오류가 발생했습니다.',
      { error: String(error) },
    );
  }
}

/**
 * 검사 결과 상세 조회
 */
export async function getTestById(
  supabase: SupabaseClient,
  params: { userId: string; testId: string },
): Promise<HandlerResult<TestDetailResponse, DashboardServiceError>> {
  const { userId, testId } = params;

  try {
    const { data, error } = await supabase
      .from('saju_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (error || !data) {
      return failure(
        404,
        dashboardErrorCodes.testNotFound,
        '검사 결과를 찾을 수 없습니다.',
      );
    }

    const parsed = SajuTestRowSchema.parse(data);

    if (parsed.user_id !== userId) {
      return failure(
        403,
        dashboardErrorCodes.unauthorizedAccess,
        '이 검사 결과에 접근할 권한이 없습니다.',
      );
    }

    return success({
      id: parsed.id,
      test_name: parsed.test_name,
      birth_date: parsed.birth_date,
      birth_time: parsed.birth_time,
      is_birth_time_unknown: parsed.is_birth_time_unknown,
      gender: parsed.gender,
      status: parsed.status,
      ai_model: parsed.ai_model,
      summary_result: parsed.summary_result,
      full_result: parsed.full_result,
      error_message: parsed.error_message,
      created_at: parsed.created_at,
      completed_at: parsed.completed_at,
    });
  } catch (error) {
    return failure(
      500,
      dashboardErrorCodes.databaseError,
      '검사 결과를 조회하는 중 오류가 발생했습니다.',
      { error: String(error) },
    );
  }
}

/**
 * 사용자 구독 정보 조회
 */
export async function getUserSubscription(
  supabase: SupabaseClient,
  params: { userId: string },
): Promise<HandlerResult<UserSubscription, DashboardServiceError>> {
  const { userId } = params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_tier, remaining_tests')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return failure(
        404,
        dashboardErrorCodes.userNotFound,
        '사용자 정보를 찾을 수 없습니다.',
      );
    }

    const parsed = UserInfoRowSchema.pick({
      subscription_tier: true,
      remaining_tests: true,
    }).parse(data);

    return success({
      subscription_tier: parsed.subscription_tier,
      remaining_tests: parsed.remaining_tests,
    });
  } catch (error) {
    return failure(
      500,
      dashboardErrorCodes.databaseError,
      '사용자 정보를 조회하는 중 오류가 발생했습니다.',
      { error: String(error) },
    );
  }
}

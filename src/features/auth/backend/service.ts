import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import {
  UserResponseSchema,
  UserTableRowSchema,
  type UserResponse,
  type UserRow,
} from './schema';
import { authErrorCodes, type AuthServiceError } from './error';

const USERS_TABLE = 'users';

// Clerk Webhook 데이터 타입 (schema와 일치하도록 선택적 필드 포함)
interface ClerkUserData {
  id?: string;
  email_addresses?: Array<{ email_address?: string }>;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
}

/**
 * 사용자 생성 (Clerk Webhook용)
 */
export const createUser = async (
  client: SupabaseClient,
  userData: ClerkUserData,
): Promise<HandlerResult<void, AuthServiceError, unknown>> => {
  // ID 검증
  if (!userData.id) {
    return failure(400, authErrorCodes.validationError, 'User ID is required');
  }

  // 이메일 검증
  const email = userData.email_addresses?.[0]?.email_address;
  if (!email) {
    return failure(
      400,
      authErrorCodes.validationError,
      'Email address is required',
    );
  }

  const name = [userData.first_name, userData.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || null;

  const { error } = await client.from(USERS_TABLE).insert({
    id: userData.id,
    email,
    name,
    profile_image_url: userData.image_url,
    subscription_tier: 'free',
    remaining_tests: 3,
  });

  if (error) {
    return failure(
      500,
      authErrorCodes.createError,
      `Failed to create user: ${error.message}`,
    );
  }

  return success(undefined, 201);
};

/**
 * 사용자 정보 업데이트 (Clerk Webhook용)
 */
export const updateUser = async (
  client: SupabaseClient,
  userData: ClerkUserData,
): Promise<HandlerResult<void, AuthServiceError, unknown>> => {
  // ID 검증
  if (!userData.id) {
    return failure(400, authErrorCodes.validationError, 'User ID is required');
  }

  const email = userData.email_addresses?.[0]?.email_address;
  const name = [userData.first_name, userData.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || null;

  const { error } = await client
    .from(USERS_TABLE)
    .update({
      email,
      name,
      profile_image_url: userData.image_url,
    })
    .eq('id', userData.id);

  if (error) {
    return failure(
      500,
      authErrorCodes.updateError,
      `Failed to update user: ${error.message}`,
    );
  }

  return success(undefined);
};

/**
 * 사용자 삭제 (Clerk Webhook용)
 */
export const deleteUser = async (
  client: SupabaseClient,
  userId: string,
): Promise<HandlerResult<void, AuthServiceError, unknown>> => {
  const { error } = await client
    .from(USERS_TABLE)
    .delete()
    .eq('id', userId);

  if (error) {
    return failure(
      500,
      authErrorCodes.deleteError,
      `Failed to delete user: ${error.message}`,
    );
  }

  return success(undefined);
};

/**
 * 사용자 정보 조회 (ID 기준)
 */
export const getUserById = async (
  client: SupabaseClient,
  userId: string,
): Promise<HandlerResult<UserResponse, AuthServiceError, unknown>> => {
  const { data, error } = await client
    .from(USERS_TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle<UserRow>();

  if (error) {
    return failure(500, authErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return failure(404, authErrorCodes.notFound, 'User not found');
  }

  const rowParse = UserTableRowSchema.safeParse(data);

  if (!rowParse.success) {
    return failure(
      500,
      authErrorCodes.validationError,
      'User row failed validation',
      rowParse.error.format(),
    );
  }

  // snake_case를 camelCase로 변환
  const mapped = {
    id: rowParse.data.id,
    email: rowParse.data.email,
    name: rowParse.data.name,
    profileImageUrl: rowParse.data.profile_image_url,
    subscriptionTier: rowParse.data.subscription_tier,
    remainingTests: rowParse.data.remaining_tests,
    createdAt: rowParse.data.created_at,
    updatedAt: rowParse.data.updated_at,
  } satisfies UserResponse;

  const parsed = UserResponseSchema.safeParse(mapped);

  if (!parsed.success) {
    return failure(
      500,
      authErrorCodes.validationError,
      'User response failed validation',
      parsed.error.format(),
    );
  }

  return success(parsed.data);
};

/**
 * 사용자 존재 여부 확인 후 생성 (Fallback)
 * Webhook이 실패한 경우를 대비한 백업 로직
 */
export const ensureUserExists = async (
  client: SupabaseClient,
  userData: ClerkUserData,
): Promise<HandlerResult<void, AuthServiceError, unknown>> => {
  // ID 검증
  if (!userData.id) {
    return failure(400, authErrorCodes.validationError, 'User ID is required');
  }

  const { data } = await client
    .from(USERS_TABLE)
    .select('id')
    .eq('id', userData.id)
    .maybeSingle();

  if (!data) {
    return createUser(client, userData);
  }

  return success(undefined);
};

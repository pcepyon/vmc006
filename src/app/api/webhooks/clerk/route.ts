import { Webhook } from 'svix';
import { headers } from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { ClerkWebhookEventSchema } from '@/features/auth/backend/schema';
import {
  createUser,
  updateUser,
  deleteUser,
} from '@/features/auth/backend/service';
import type { ErrorResult } from '@/backend/http/response';
import type { AuthServiceError } from '@/features/auth/backend/error';

export const runtime = 'nodejs';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

// 헬스체크 엔드포인트
export async function GET() {
  return Response.json({
    status: 'ok',
    endpoint: '/api/webhooks/clerk',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    config: {
      hasWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      webhookSecretPrefix: process.env.CLERK_WEBHOOK_SECRET?.slice(0, 12) || 'not set',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) || 'not set',
    },
  });
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔔 [${requestId}] Webhook 요청 수신:`, new Date().toISOString());
  console.log(`📍 [${requestId}] URL:`, req.url);

  // 1단계: Svix 헤더 추출
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  console.log(`📋 [${requestId}] 1단계: 헤더 검증`);
  console.log(`   - svix-id: ${svixId || '❌ 없음'}`);
  console.log(`   - svix-timestamp: ${svixTimestamp || '❌ 없음'}`);
  console.log(`   - svix-signature: ${svixSignature ? svixSignature.slice(0, 20) + '...' : '❌ 없음'}`);

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error(`❌ [${requestId}] 1단계 실패: Svix 헤더 누락`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return new Response('Missing svix headers', { status: 400 });
  }
  console.log(`✅ [${requestId}] 1단계 성공: 헤더 검증 완료`);

  // 2단계: Webhook 페이로드 파싱
  const payload = await req.text();
  console.log(`📦 [${requestId}] 2단계: 페이로드 파싱`);
  console.log(`   - 페이로드 길이: ${payload.length} bytes`);

  // 3단계: Webhook 서명 검증
  console.log(`🔐 [${requestId}] 3단계: 서명 검증`);
  console.log(`   - Webhook Secret 존재: ${!!webhookSecret}`);
  console.log(`   - Webhook Secret Prefix: ${webhookSecret?.slice(0, 12) || '❌ 없음'}`);

  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
    console.log(`✅ [${requestId}] 3단계 성공: 서명 검증 완료`);
  } catch (err) {
    console.error(`❌ [${requestId}] 3단계 실패: 서명 검증 실패`);
    console.error(`   - 에러:`, err);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return new Response('Invalid signature', { status: 400 });
  }

  // 4단계: 이벤트 파싱
  console.log(`📝 [${requestId}] 4단계: 이벤트 스키마 검증`);
  const parsedEvent = ClerkWebhookEventSchema.safeParse(evt);

  if (!parsedEvent.success) {
    console.error(`❌ [${requestId}] 4단계 실패: 이벤트 형식 검증 실패`);
    console.error(`   - Zod 에러:`, JSON.stringify(parsedEvent.error.format(), null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return new Response('Invalid event format', { status: 400 });
  }

  const eventType = parsedEvent.data.type;
  const userId = parsedEvent.data.data.id;
  const userEmail = parsedEvent.data.data.email_addresses?.[0]?.email_address;

  console.log(`✅ [${requestId}] 4단계 성공: 이벤트 파싱 완료`);
  console.log(`   - 이벤트 타입: ${eventType}`);
  console.log(`   - 사용자 ID: ${userId}`);
  console.log(`   - 사용자 이메일: ${userEmail || '없음'}`);

  // 5단계: Supabase 클라이언트 생성
  console.log(`💾 [${requestId}] 5단계: Supabase 연결`);
  console.log(`   - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ 없음'}`);
  console.log(`   - Service Key 존재: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  console.log(`✅ [${requestId}] 5단계 성공: Supabase 클라이언트 생성 완료`);

  // 6단계: 이벤트 타입별 처리
  console.log(`⚙️ [${requestId}] 6단계: 이벤트 처리 시작 (${eventType})`);

  try {
    switch (eventType) {
      case 'user.created': {
        console.log(`   [${requestId}] 6-A: createUser 호출`);
        const result = await createUser(supabase, parsedEvent.data.data);

        if (!result.ok) {
          const errorResult = result as ErrorResult<AuthServiceError, unknown>;
          console.error(`❌ [${requestId}] 6-A 실패: 사용자 생성 실패`);
          console.error(`   - 에러 코드: ${errorResult.error.code}`);
          console.error(`   - 에러 메시지: ${errorResult.error.message}`);
          console.error(`   - HTTP 상태: ${errorResult.status}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          return new Response('Failed to create user', { status: 500 });
        }

        console.log(`✅ [${requestId}] 6-A 성공: 사용자 생성 완료 (${userId})`);
        break;
      }

      case 'user.updated': {
        console.log(`   [${requestId}] 6-B: updateUser 호출`);
        const result = await updateUser(supabase, parsedEvent.data.data);

        if (!result.ok) {
          const errorResult = result as ErrorResult<AuthServiceError, unknown>;
          console.error(`❌ [${requestId}] 6-B 실패: 사용자 업데이트 실패`);
          console.error(`   - 에러 코드: ${errorResult.error.code}`);
          console.error(`   - 에러 메시지: ${errorResult.error.message}`);
          console.error(`   - HTTP 상태: ${errorResult.status}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          return new Response('Failed to update user', { status: 500 });
        }

        console.log(`✅ [${requestId}] 6-B 성공: 사용자 업데이트 완료 (${userId})`);
        break;
      }

      case 'user.deleted': {
        console.log(`   [${requestId}] 6-C: deleteUser 호출`);
        const result = await deleteUser(supabase, parsedEvent.data.data.id!);

        if (!result.ok) {
          const errorResult = result as ErrorResult<AuthServiceError, unknown>;
          console.error(`❌ [${requestId}] 6-C 실패: 사용자 삭제 실패`);
          console.error(`   - 에러 코드: ${errorResult.error.code}`);
          console.error(`   - 에러 메시지: ${errorResult.error.message}`);
          console.error(`   - HTTP 상태: ${errorResult.status}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          return new Response('Failed to delete user', { status: 500 });
        }

        console.log(`✅ [${requestId}] 6-C 성공: 사용자 삭제 완료 (${userId})`);
        break;
      }

      default:
        console.log(`⚠️ [${requestId}] 6단계: 처리되지 않은 이벤트 타입 (${eventType})`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] 모든 단계 성공`);
    console.log(`⏱️ [${requestId}] 처리 시간: ${duration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return new Response('Webhook processed', { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${requestId}] 예상치 못한 에러 (${duration}ms)`);
    console.error(`   - 에러:`, error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return new Response('Internal server error', { status: 500 });
  }
}

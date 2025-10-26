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

export async function POST(req: Request) {
  // Svix 헤더 추출
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing svix headers');
    return new Response('Missing svix headers', { status: 400 });
  }

  // Webhook 페이로드 파싱
  const payload = await req.text();

  // Webhook 서명 검증
  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // 이벤트 파싱
  const parsedEvent = ClerkWebhookEventSchema.safeParse(evt);

  if (!parsedEvent.success) {
    console.error('Invalid webhook event format:', parsedEvent.error);
    return new Response('Invalid event format', { status: 400 });
  }

  // Supabase 클라이언트 생성
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 이벤트 타입별 처리
  const eventType = parsedEvent.data.type;

  try {
    switch (eventType) {
      case 'user.created': {
        const result = await createUser(supabase, parsedEvent.data.data);

        if (!result.ok) {
          const errorResult = result as ErrorResult<AuthServiceError, unknown>;
          console.error('Failed to create user:', {
            code: errorResult.error.code,
            message: errorResult.error.message,
          });
          return new Response('Failed to create user', { status: 500 });
        }

        console.log(`✅ User created: ${parsedEvent.data.data.id}`);
        break;
      }

      case 'user.updated': {
        const result = await updateUser(supabase, parsedEvent.data.data);

        if (!result.ok) {
          const errorResult = result as ErrorResult<AuthServiceError, unknown>;
          console.error('Failed to update user:', {
            code: errorResult.error.code,
            message: errorResult.error.message,
          });
          return new Response('Failed to update user', { status: 500 });
        }

        console.log(`✅ User updated: ${parsedEvent.data.data.id}`);
        break;
      }

      case 'user.deleted': {
        const result = await deleteUser(supabase, parsedEvent.data.data.id!);

        if (!result.ok) {
          const errorResult = result as ErrorResult<AuthServiceError, unknown>;
          console.error('Failed to delete user:', {
            code: errorResult.error.code,
            message: errorResult.error.message,
          });
          return new Response('Failed to delete user', { status: 500 });
        }

        console.log(`✅ User deleted: ${parsedEvent.data.data.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

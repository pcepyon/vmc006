import { z } from 'zod';

// Clerk Webhook 이벤트 스키마
export const ClerkWebhookEventSchema = z.object({
  type: z.enum(['user.created', 'user.updated', 'user.deleted']),
  data: z.object({
    id: z.string(),
    email_addresses: z
      .array(
        z.object({
          email_address: z.string().email(),
        }),
      )
      .optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    image_url: z.string().url().nullable().optional(),
  }),
});

export type ClerkWebhookEvent = z.infer<typeof ClerkWebhookEventSchema>;

// User 테이블 Row 스키마
export const UserTableRowSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  profile_image_url: z.string().url().nullable(),
  subscription_tier: z.enum(['free', 'pro']),
  remaining_tests: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type UserRow = z.infer<typeof UserTableRowSchema>;

// User 응답 스키마 (camelCase)
export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  profileImageUrl: z.string().url().nullable(),
  subscriptionTier: z.enum(['free', 'pro']),
  remainingTests: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

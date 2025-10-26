'use client';

import { useUser as useClerkUser } from '@clerk/nextjs';
import { useUser } from '@/features/auth/hooks/useUser';
import { Loader2 } from 'lucide-react';

export const UserProfile = () => {
  const { user: clerkUser } = useClerkUser();
  const { data: userData, isLoading, error } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>로딩 중...</span>
      </div>
    );
  }

  if (error || !userData) {
    return <div className="text-red-500">사용자 정보를 불러올 수 없습니다</div>;
  }

  return (
    <div className="flex items-center gap-3">
      {userData.profileImageUrl && (
        <img
          src={userData.profileImageUrl}
          alt={userData.name || '프로필'}
          className="h-10 w-10 rounded-full"
        />
      )}
      <div className="flex flex-col">
        <span className="font-medium">
          {userData.name || clerkUser?.emailAddresses[0]?.emailAddress}
        </span>
        <span className="text-sm text-gray-500">
          {userData.subscriptionTier === 'pro' ? 'Pro' : '무료'} · 잔여{' '}
          {userData.remainingTests}회
        </span>
      </div>
    </div>
  );
};

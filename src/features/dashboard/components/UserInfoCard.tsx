'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface UserInfoCardProps {
  email: string;
  subscriptionTier: 'free' | 'pro';
  remainingTests: number;
  onClick: () => void;
}

export function UserInfoCard({
  email,
  subscriptionTier,
  remainingTests,
  onClick,
}: UserInfoCardProps) {
  const isPro = subscriptionTier === 'pro';
  const tierLabel = isPro ? 'Pro' : '무료 플랜';
  const testsLabel = isPro
    ? `${remainingTests}/10회 남음`
    : `${remainingTests}회 남음`;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-medium truncate">{email}</p>
        <div className="flex items-center justify-between">
          <Badge variant={isPro ? 'default' : 'secondary'}>{tierLabel}</Badge>
          <span
            className={`text-sm font-medium ${
              remainingTests === 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {testsLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatDate, formatRelativeTime } from '@/lib/utils/date';
import type { TestHistoryItem } from '../lib/dto';

interface TestCardProps {
  test: TestHistoryItem;
}

const statusConfig = {
  completed: { label: '완료', variant: 'default' as const },
  processing: { label: '분석 중', variant: 'secondary' as const },
  failed: { label: '실패', variant: 'destructive' as const },
};

export function TestCard({ test }: TestCardProps) {
  const router = useRouter();
  const statusInfo = statusConfig[test.status];

  const handleClick = () => {
    router.push(`/dashboard/result/${test.id}`);
  };

  return (
    <Card
      onClick={handleClick}
      className="cursor-pointer transition-shadow hover:shadow-lg"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-semibold">{test.test_name}</h3>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">
          생년월일: {formatDate(test.birth_date)}
        </p>
        <p className="text-sm text-muted-foreground">
          성별: {test.gender === 'male' ? '남성' : '여성'}
        </p>
      </CardContent>
      <CardFooter>
        <time className="text-xs text-muted-foreground">
          {formatRelativeTime(test.created_at)}
        </time>
      </CardFooter>
    </Card>
  );
}

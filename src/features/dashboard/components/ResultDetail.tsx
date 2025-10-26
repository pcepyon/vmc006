'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatTime, formatDateTime } from '@/lib/utils/date';
import type { TestDetailResponse } from '../lib/dto';

interface ResultDetailProps {
  test: TestDetailResponse;
}

const statusConfig = {
  completed: { label: '완료', variant: 'default' as const },
  processing: { label: '분석 중', variant: 'secondary' as const },
  failed: { label: '실패', variant: 'destructive' as const },
};

export function ResultDetail({ test }: ResultDetailProps) {
  const statusInfo = statusConfig[test.status];

  if (test.status === 'processing') {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <div className="animate-pulse">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              분석 진행 중
            </Badge>
          </div>
          <p className="text-muted-foreground">
            분석이 진행 중입니다. 잠시만 기다려주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (test.status === 'failed') {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Badge variant="destructive" className="text-lg px-4 py-2">
            분석 실패
          </Badge>
          <p className="text-destructive">
            {test.error_message || '분석 중 오류가 발생했습니다.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{test.test_name}</CardTitle>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                생년월일
              </p>
              <p className="text-base">{formatDate(test.birth_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">성별</p>
              <p className="text-base">
                {test.gender === 'male' ? '남성' : '여성'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                출생시간
              </p>
              <p className="text-base">
                {test.is_birth_time_unknown
                  ? '정보 없음'
                  : formatTime(test.birth_time)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                AI 모델
              </p>
              <p className="text-base">{test.ai_model}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              분석 수행 시각
            </p>
            <p className="text-sm">
              {test.completed_at
                ? formatDateTime(test.completed_at)
                : formatDateTime(test.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>분석 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {test.full_result ? (
              <div className="whitespace-pre-wrap">{test.full_result}</div>
            ) : (
              <p className="text-muted-foreground">
                분석 결과가 없습니다.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

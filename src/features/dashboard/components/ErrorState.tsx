'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  error: {
    status?: number;
    message: string;
  };
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (error.status === 404) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold">검사 결과를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground">
          요청하신 검사 결과가 존재하지 않거나 삭제되었습니다.
        </p>
        <Button onClick={onRetry}>대시보드로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <AlertCircle className="h-16 w-16 text-destructive" />
      <h2 className="text-2xl font-semibold">문제가 발생했습니다</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={onRetry}>다시 시도</Button>
    </div>
  );
}

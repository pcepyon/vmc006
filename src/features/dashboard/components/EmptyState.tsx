'use client';

import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <SearchX className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-2xl font-semibold">검사 내역이 없습니다</h2>
      <p className="text-muted-foreground">첫 사주 분석을 시작해보세요</p>
      <Button asChild>
        <Link href="/dashboard/new">새 검사 시작</Link>
      </Button>
    </div>
  );
}

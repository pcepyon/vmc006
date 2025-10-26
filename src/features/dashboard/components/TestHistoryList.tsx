'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TestCard } from './TestCard';
import { EmptyState } from './EmptyState';
import type { TestHistoryItem, Pagination } from '../lib/dto';

interface TestHistoryListProps {
  tests: TestHistoryItem[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function TestHistoryList({
  tests,
  pagination,
  onPageChange,
}: TestHistoryListProps) {
  if (tests.length === 0) {
    return <EmptyState />;
  }

  const { page, total_pages } = pagination;
  const hasPrevPage = page > 1;
  const hasNextPage = page < total_pages;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tests.map((test) => (
          <TestCard key={test.id} test={test} />
        ))}
      </div>

      {total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={!hasPrevPage}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground">
            {page} / {total_pages}
          </span>

          <Button
            variant="outline"
            size="icon"
            disabled={!hasNextPage}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

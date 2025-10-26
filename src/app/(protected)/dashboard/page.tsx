'use client';

import { useState } from 'react';
import { useDebounce } from 'react-use';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { SearchBar } from '@/features/dashboard/components/SearchBar';
import { TestHistoryList } from '@/features/dashboard/components/TestHistoryList';
import { EmptyState } from '@/features/dashboard/components/EmptyState';
import { ErrorState } from '@/features/dashboard/components/ErrorState';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { extractApiErrorMessage } from '@/lib/remote/api-client';

type DashboardPageProps = {
  params: Promise<Record<string, never>>;
};

export default function DashboardPage({ params }: DashboardPageProps) {
  void params;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || '',
  );
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);

  useDebounce(
    () => setDebouncedQuery(searchQuery),
    300,
    [searchQuery],
  );

  const { data, isLoading, error, refetch } = useDashboard(
    page,
    debouncedQuery || undefined,
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);

    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState
          error={{ message: extractApiErrorMessage(error) }}
          onRetry={() => refetch()}
        />
      </DashboardLayout>
    );
  }

  const hasTests = data && data.tests.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">검사 이력</h1>
          <p className="text-muted-foreground">
            과거에 수행한 사주 분석 결과를 확인하세요
          </p>
        </header>

        <SearchBar
          value={searchQuery}
          onChange={handleSearch}
          isLoading={isLoading}
        />

        {isLoading && !data ? (
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
          </div>
        ) : hasTests ? (
          <TestHistoryList
            tests={data.tests}
            pagination={data.pagination}
            onPageChange={setPage}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </DashboardLayout>
  );
}

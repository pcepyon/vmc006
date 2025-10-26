'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ResultDetail } from '@/features/dashboard/components/ResultDetail';
import { ErrorState } from '@/features/dashboard/components/ErrorState';
import { useTestDetail } from '@/features/dashboard/hooks/useTestDetail';
import { extractApiErrorMessage } from '@/lib/remote/api-client';

interface ResultDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ResultDetailPage({ params }: ResultDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error, refetch } = useTestDetail(id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

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

  if (!data) {
    return (
      <DashboardLayout>
        <ErrorState
          error={{ status: 404, message: '검사 결과를 찾을 수 없습니다' }}
          onRetry={() => router.push('/dashboard')}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ResultDetail test={data} />
    </DashboardLayout>
  );
}

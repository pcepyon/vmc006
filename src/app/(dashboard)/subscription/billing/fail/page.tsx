'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';
import { Suspense } from 'react';

function FailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code');
  const message = searchParams.get('message');

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full border-red-500">
        <CardHeader>
          <CardTitle className="text-center text-red-600">결제 실패</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <XCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
          <p className="text-gray-600 mb-2">
            {message || '카드 등록에 실패했습니다'}
          </p>
          {code && <p className="text-sm text-gray-500 mb-4">오류 코드: {code}</p>}
          <Button onClick={() => router.push('/subscription')} className="w-full">
            구독 관리 페이지로 돌아가기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FailPage() {
  return (
    <Suspense fallback={null}>
      <FailPageContent />
    </Suspense>
  );
}

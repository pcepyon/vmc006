'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useTossPayments } from '@/features/subscription/hooks/useTossPayments';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Suspense, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

function BillingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const customerKey = searchParams.get('customerKey');

  const { tossPayments, isLoading, error, requestBillingAuth } = useTossPayments();

  // API 개별 연동 방식에서는 위젯 렌더링이 필요 없음
  // 버튼 클릭 시 바로 결제창 호출

  const handleIssueBillingKey = async () => {
    if (!tossPayments || !customerKey) {
      toast({
        title: '오류',
        description: 'customerKey가 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // API 개별 연동 방식으로 빌링키 발급 요청
      await requestBillingAuth({
        customerKey,
        successUrl: `${window.location.origin}/subscription/billing/success?customerKey=${customerKey}`,
        failUrl: `${window.location.origin}/subscription/billing/fail`,
        customerEmail: user?.primaryEmailAddress?.emailAddress,
        customerName: user?.fullName || user?.username,
      });
    } catch (error: any) {
      toast({
        title: '빌링키 발급 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">오류 발생</h1>
        <p>{error.message}</p>
        <Button onClick={() => router.back()} className="mt-4">
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>카드 등록</CardTitle>
          <CardDescription>정기결제를 위한 카드 정보를 등록합니다.</CardDescription>
          <p className="text-sm text-red-600">
            ⚠️ 테스트 모드: 실제 결제가 발생하지 않습니다.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <p className="text-sm text-muted-foreground">
              버튼을 클릭하면 토스페이먼츠 결제창이 열립니다.
              카드 정보를 입력하여 정기결제를 위한 빌링키를 발급받으세요.
            </p>
          </div>

          <Button
            onClick={handleIssueBillingKey}
            className="w-full"
            disabled={!tossPayments || !customerKey}
          >
            카드 등록하기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}

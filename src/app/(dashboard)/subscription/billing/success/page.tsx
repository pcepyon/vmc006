'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useConfirmBilling } from '@/features/subscription/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const confirmMutation = useConfirmBilling();

  const customerKey = searchParams.get('customerKey');
  const authKey = searchParams.get('authKey');

  useEffect(() => {
    if (!customerKey || !authKey) {
      toast({
        title: '잘못된 접근',
        description: '필요한 정보가 없습니다',
        variant: 'destructive',
      });
      router.push('/subscription');
      return;
    }

    const confirmBilling = async () => {
      try {
        await confirmMutation.mutateAsync({ customerKey, authKey });
        setIsSuccess(true);
        setIsProcessing(false);

        setTimeout(() => {
          router.push('/subscription');
        }, 2000);
      } catch (error: any) {
        toast({
          title: '구독 처리 실패',
          description: error.message,
          variant: 'destructive',
        });
        router.push('/subscription');
      }
    };

    confirmBilling();
  }, [customerKey, authKey, router, confirmMutation, toast]);

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">
            {isProcessing ? '구독 처리 중...' : '구독 완료'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {isProcessing ? (
            <Loader2 className="w-16 h-16 animate-spin mx-auto text-blue-600" />
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <p className="text-gray-600">Pro 구독이 완료되었습니다!</p>
              <p className="text-sm text-gray-500 mt-2">
                잠시 후 구독 관리 페이지로 이동합니다...
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}

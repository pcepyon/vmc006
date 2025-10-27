'use client';

import {
  useSubscriptionInfo,
  useCancelSubscription,
  useReactivateSubscription,
} from '@/features/subscription/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function SubscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: subscription, isLoading } = useSubscriptionInfo();
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();

  const handleUpgrade = () => {
    const customerKey = crypto.randomUUID();
    router.push(`/subscription/billing?customerKey=${customerKey}`);
  };

  const handleCancel = async () => {
    try {
      const result = await cancelMutation.mutateAsync();
      toast({
        title: '구독이 취소되었습니다',
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: '구독 취소 실패',
        description: error.message || '구독 취소 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  const handleReactivate = async () => {
    try {
      const result = await reactivateMutation.mutateAsync();
      toast({
        title: '구독이 재활성화되었습니다',
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: '구독 재활성화 실패',
        description: error.message || '구독 재활성화 중 오류가 발생했습니다',
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

  if (!subscription) {
    return <div>구독 정보를 불러올 수 없습니다.</div>;
  }

  const isFree = subscription.subscriptionTier === 'free';
  const isPro = subscription.subscriptionTier === 'pro';
  const isActive = subscription.subscription?.status === 'active';
  const isCancelled = subscription.subscription?.status === 'cancelled';

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">구독 관리</h1>

      {/* 현재 구독 정보 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>현재 구독 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 요금제 정보 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">요금제</p>
                <p className="text-2xl font-bold">{isFree ? '무료 (Free)' : 'Pro'}</p>
              </div>
              {isPro && (
                <Badge variant={isActive ? 'default' : isCancelled ? 'secondary' : 'destructive'}>
                  {isActive ? '활성' : isCancelled ? '해지 예정' : '만료'}
                </Badge>
              )}
            </div>

            {/* 검사 횟수 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">월 검사 횟수</p>
                <p className="text-lg font-semibold">
                  {isFree ? '최초 3회' : '월 10회'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">잔여 검사 횟수</p>
                <p className="text-lg font-semibold">
                  {subscription.remainingTests || 0}회
                </p>
              </div>
            </div>

            {/* Pro 구독 상세 정보 */}
            {isPro && subscription.subscription && (
              <div className="border-t pt-4 space-y-2">
                {subscription.subscription.nextBillingDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">다음 결제일</span>
                    <span className="text-sm font-medium">
                      {subscription.subscription.nextBillingDate}
                    </span>
                  </div>
                )}
                {subscription.subscription.cardCompany && subscription.subscription.cardNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">등록된 카드</span>
                    <span className="text-sm font-medium">
                      {subscription.subscription.cardCompany} {subscription.subscription.cardNumber}
                    </span>
                  </div>
                )}
                {isCancelled && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">이용 만료일</span>
                    <span className="text-sm font-medium text-red-600">
                      {subscription.subscription.nextBillingDate}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pro 업그레이드 박스 (무료 사용자만) */}
      {isFree && (
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle>Pro 요금제</CardTitle>
            <CardDescription>더 많은 검사와 고급 AI 모델을 경험하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li>✓ 월 10회 검사 가능</li>
              <li>✓ Gemini 2.5 Pro 모델 사용</li>
              <li>✓ 더 정확한 사주 분석</li>
            </ul>
            <p className="text-3xl font-bold mb-4">₩9,900 / 월</p>
            <p className="text-xs text-red-600 mb-4">
              * 구독 후 환불이 불가능합니다.
            </p>
            <Button onClick={handleUpgrade} className="w-full">
              지금 업그레이드하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 구독 해지 버튼 (Pro 활성 사용자만) */}
      {isPro && isActive && (
        <Card>
          <CardHeader>
            <CardTitle>구독 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={cancelMutation.isPending}>
                  {cancelMutation.isPending ? '처리 중...' : '구독 해지'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>구독을 해지하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {subscription.subscription?.nextBillingDate}까지 이용 가능합니다.
                    <br />
                    해지 후에는 빌링키가 삭제되어 재활성화할 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>해지하기</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* 해지 예정 안내 및 재활성화 */}
      {isPro && isCancelled && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle>구독 해지 예정</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {subscription.subscription?.nextBillingDate}까지 이용 가능합니다.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              다음 결제일 전까지 구독을 재활성화할 수 있습니다.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleReactivate}
                disabled={reactivateMutation.isPending}
                variant="default"
              >
                {reactivateMutation.isPending ? '처리 중...' : '구독 재활성화'}
              </Button>
              <p className="text-xs text-gray-500 flex items-center">
                * 재활성화 시 다음 결제일에 정상 결제됩니다
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

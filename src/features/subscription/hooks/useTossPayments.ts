'use client';

import { useEffect, useState, useRef } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';

export const useTossPayments = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const tossPaymentsRef = useRef<any>(null);

  useEffect(() => {
    const initTossPayments = async () => {
      try {
        console.log('Initializing TossPayments with clientKey:', clientKey.substring(0, 10) + '...');

        // 문서 예제대로 loadTossPayments 호출
        const tp = await loadTossPayments(clientKey);
        tossPaymentsRef.current = tp;

        // SDK 구조 확인
        console.log('TossPayments initialized:', {
          methods: Object.keys(tp),
          hasRequestBillingAuth: !!tp.requestBillingAuth,
          hasRequestPayment: !!tp.requestPayment,
          hasCancelPayment: !!tp.cancelPayment,
        });
        setIsLoading(false);
      } catch (err) {
        console.error('TossPayments initialization error:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    };

    initTossPayments();
  }, []);

  const requestBillingAuth = async (params: {
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
    customerKey: string;
  }) => {
    if (!tossPaymentsRef.current) {
      throw new Error('TossPayments is not initialized');
    }

    if (!params || !params.customerKey) {
      throw new Error('customerKey is required for billing auth');
    }

    try {
      console.log('Requesting billing auth with params:', {
        customerKey: params.customerKey,
        successUrl: params.successUrl,
        failUrl: params.failUrl,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
      });

      // SDK v1 패턴 확인: requestBillingAuth가 직접 TossPayments 객체에 있는지 확인
      if (!tossPaymentsRef.current.requestBillingAuth) {
        console.error('TossPayments structure:', tossPaymentsRef.current);
        console.error('Available methods:', Object.keys(tossPaymentsRef.current));
        throw new Error('requestBillingAuth method not found. Check if the SDK is loaded correctly.');
      }

      // SDK v1: 첫 번째 파라미터는 결제 수단, 두 번째는 옵션 객체
      const billingAuthParams = {
        customerKey: params.customerKey,
        successUrl: params.successUrl,
        failUrl: params.failUrl,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
      };

      console.log('Calling tossPayments.requestBillingAuth with method: "카드" and params:', billingAuthParams);

      // ✅ SDK v1 패턴: 첫 번째 파라미터로 '카드', 두 번째로 옵션 객체
      await tossPaymentsRef.current.requestBillingAuth('카드', billingAuthParams);

      console.log('Billing auth request sent successfully');
    } catch (error: any) {
      console.error('Billing auth request error:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      throw error;
    }
  };

  return {
    tossPayments: tossPaymentsRef.current,
    isLoading,
    error,
    requestBillingAuth,
  };
};
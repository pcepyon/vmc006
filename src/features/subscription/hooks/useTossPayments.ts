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

      // requestBillingAuth가 직접 TossPayments 객체에 있음
      if (!tossPaymentsRef.current.requestBillingAuth) {
        console.error('TossPayments structure:', tossPaymentsRef.current);
        console.error('Available methods:', Object.keys(tossPaymentsRef.current));
        throw new Error('requestBillingAuth method not found. Check if the SDK is loaded correctly.');
      }

      // SDK가 파라미터를 다르게 받을 수 있으므로 여러 방법 시도
      const billingAuthParams = {
        method: 'CARD',
        successUrl: params.successUrl,
        failUrl: params.failUrl,
        customerKey: params.customerKey,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
      };

      console.log('Calling requestBillingAuth with:', billingAuthParams);

      // 빌링키 발급 요청 - TossPayments 객체에서 직접 호출
      await tossPaymentsRef.current.requestBillingAuth(billingAuthParams);

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
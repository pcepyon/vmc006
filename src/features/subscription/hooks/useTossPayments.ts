'use client';

import { useEffect, useState } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';

export const useTossPayments = (customerKey?: string) => {
  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!customerKey) {
      setIsLoading(false);
      return;
    }

    const initWidget = async () => {
      try {
        const widget = await loadPaymentWidget(clientKey, customerKey);
        setPaymentWidget(widget);
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    initWidget();
  }, [customerKey]);

  const requestBillingAuth = async (params: {
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }) => {
    if (!paymentWidget) {
      throw new Error('Payment widget is not initialized');
    }

    await paymentWidget.requestBillingAuth({
      method: 'CARD',
      ...params,
    });
  };

  return {
    paymentWidget,
    isLoading,
    error,
    requestBillingAuth,
  };
};

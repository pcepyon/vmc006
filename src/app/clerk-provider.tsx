'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { koKR } from '@clerk/localizations';

export function ClerkClientProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider localization={koKR}>
      {children}
    </ClerkProvider>
  );
}
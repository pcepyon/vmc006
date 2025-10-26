import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { ClerkProvider } from '@clerk/nextjs';
import { koKR } from '@clerk/localizations';

export const metadata: Metadata = {
  title: '사주 분석 웹앱',
  description: 'AI 기반 사주 분석 서비스',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={koKR}>
      <html lang="ko" suppressHydrationWarning>
        <body className="antialiased font-sans">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}

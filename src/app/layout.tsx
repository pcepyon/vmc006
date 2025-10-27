import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { ClerkClientProvider } from './clerk-provider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: '사주 분석 웹앱',
  description: 'AI 기반 사주 분석 서비스',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkClientProvider>
      <html lang="ko" suppressHydrationWarning>
        <body className="antialiased font-sans">
          <Providers>
            <div className="flex min-h-screen flex-col">
              <Header />
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
          </Providers>
        </body>
      </html>
    </ClerkClientProvider>
  );
}

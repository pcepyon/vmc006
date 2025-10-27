import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 공개 라우트 패턴 정의
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

// 보호할 라우트 패턴 정의
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/subscription(.*)',
  '/analysis(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // 공개 라우트는 바로 통과
  if (isPublicRoute(req)) {
    return;
  }

  // 보호된 라우트에 대해서만 인증 확인
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Next.js 내부 파일과 정적 파일 제외
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API 라우트 포함
    '/(api|trpc)(.*)',
  ],
};

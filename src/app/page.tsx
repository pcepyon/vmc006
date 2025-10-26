"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Sparkles, Zap, Shield, TrendingUp } from "lucide-react";

export default function LandingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const handleGetStarted = useCallback(() => {
    if (isLoaded) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/sign-in");
      }
    }
  }, [isLoaded, user, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            AI 기반 사주 분석 서비스
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            최신 AI 기술로 당신의 사주를 정확하게 분석하고,
            <br />
            미래를 예측해드립니다
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={handleGetStarted}
              disabled={!isLoaded}
              className="rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {!isLoaded ? "로딩 중..." : "시작하기"}
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-indigo-400">
            프리미엄 기능
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            왜 저희 서비스를 선택해야 할까요?
          </p>
        </div>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-4">
          <Feature
            icon={<Sparkles className="h-6 w-6" />}
            title="AI 기반 분석"
            description="최신 Gemini AI를 활용한 정확한 사주 풀이를 제공합니다"
          />
          <Feature
            icon={<Zap className="h-6 w-6" />}
            title="빠른 결과"
            description="몇 초 만에 상세한 사주 분석 결과를 확인할 수 있습니다"
          />
          <Feature
            icon={<Shield className="h-6 w-6" />}
            title="안전한 보관"
            description="모든 검사 이력을 안전하게 저장하고 언제든 다시 확인할 수 있습니다"
          />
          <Feature
            icon={<TrendingUp className="h-6 w-6" />}
            title="Pro 요금제"
            description="고급 AI 모델과 월 10회 검사로 더 자세한 분석을 받아보세요"
          />
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-indigo-400">
            요금제
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            합리적인 가격으로 시작하세요
          </p>
        </div>
        <div className="mx-auto grid max-w-lg grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2">
          <PricingCard
            title="무료"
            price="₩0"
            features={[
              "최초 3회 무료 검사",
              "기본 AI 모델 (Gemini Flash)",
              "검사 이력 저장",
            ]}
            buttonText="무료로 시작하기"
            onClick={handleGetStarted}
            isLoaded={isLoaded}
          />
          <PricingCard
            title="Pro"
            price="₩9,900"
            period="/ 월"
            features={[
              "월 10회 검사",
              "고급 AI 모델 (Gemini Pro)",
              "검사 이력 무제한 저장",
              "우선 지원",
            ]}
            buttonText="Pro로 업그레이드"
            onClick={handleGetStarted}
            isLoaded={isLoaded}
            highlighted
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <p className="text-center text-sm text-slate-400">
            © 2025 사주 분석 웹앱. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8 backdrop-blur-sm">
      <div className="mb-4 inline-flex rounded-lg bg-indigo-600/10 p-3 text-indigo-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-300">{description}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  period,
  features,
  buttonText,
  onClick,
  isLoaded,
  highlighted = false,
}: {
  title: string;
  price: string;
  period?: string;
  features: string[];
  buttonText: string;
  onClick: () => void;
  isLoaded: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-8 ${
        highlighted
          ? "border-2 border-indigo-500 bg-slate-900/80 shadow-lg shadow-indigo-500/20"
          : "border border-slate-700 bg-slate-900/60"
      }`}
    >
      <h3 className="text-2xl font-bold text-white">{title}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-white">{price}</span>
        {period && <span className="text-slate-400">{period}</span>}
      </div>
      <ul className="mt-8 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <svg
              className="h-6 w-6 flex-shrink-0 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            <span className="text-sm text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        disabled={!isLoaded}
        className={`mt-8 w-full rounded-md px-4 py-3 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
          highlighted
            ? "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600"
            : "bg-white text-slate-900 hover:bg-slate-100 focus-visible:outline-white"
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
}

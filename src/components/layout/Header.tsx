"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut, User } from "lucide-react";

export function Header() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  return (
    <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-lg font-bold text-white">사</span>
            </div>
            <span className="text-lg font-semibold text-white">
              사주 분석
            </span>
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {!isLoaded ? (
              <div className="h-9 w-24 animate-pulse rounded-md bg-slate-700" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:bg-slate-800"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">대시보드</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 rounded-md bg-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:bg-slate-800"
                >
                  로그인
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

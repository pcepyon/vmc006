"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-700 bg-slate-900/60">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <span className="text-lg font-bold text-white">사</span>
              </div>
              <span className="text-lg font-semibold text-white">
                사주 분석
              </span>
            </div>
            <p className="text-sm text-slate-400">
              AI 기반 사주 분석 서비스
              <br />
              정확하고 빠른 사주 풀이
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">서비스</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-slate-400 hover:text-white transition"
                >
                  대시보드
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/new"
                  className="text-sm text-slate-400 hover:text-white transition"
                >
                  새 검사
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/subscription"
                  className="text-sm text-slate-400 hover:text-white transition"
                >
                  구독 관리
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">법적 고지</h3>
            <ul className="space-y-2">
              <li>
                <button className="text-sm text-slate-400 hover:text-white transition">
                  이용약관
                </button>
              </li>
              <li>
                <button className="text-sm text-slate-400 hover:text-white transition">
                  개인정보처리방침
                </button>
              </li>
              <li>
                <button className="text-sm text-slate-400 hover:text-white transition">
                  환불 정책
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-slate-700 pt-8">
          <p className="text-center text-sm text-slate-400">
            © {new Date().getFullYear()} 사주 분석 웹앱. All rights reserved.
          </p>
          <p className="text-center text-xs text-slate-500 mt-2">
            사업자등록번호: 123-45-67890 | 대표: 홍길동
            <br />
            주소: 서울특별시 강남구 테헤란로 123
            <br />
            고객센터: 1588-0000 | 이메일: support@saju.com
          </p>
        </div>
      </div>
    </footer>
  );
}

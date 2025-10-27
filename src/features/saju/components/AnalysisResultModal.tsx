'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface AnalysisResultModalProps {
  open: boolean
  onClose: () => void
  onViewDetail: () => void
  testName: string
  birthDate: string
  gender: 'male' | 'female'
  summary: string
}

export function AnalysisResultModal({
  open,
  onClose,
  onViewDetail,
  testName,
  birthDate,
  gender,
  summary,
}: AnalysisResultModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">분석 완료</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="닫기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-muted-foreground">검사 대상자</p>
              <p className="font-medium">{testName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">생년월일</p>
              <p className="font-medium">{birthDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground">성별</p>
              <p className="font-medium">{gender === 'male' ? '남성' : '여성'}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">요약</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {summary}
            </p>
          </div>
        </div>

        <div className="p-6 bg-muted/30 flex justify-end gap-3 mt-auto">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={onViewDetail}>상세 보기</Button>
        </div>
      </div>
    </div>
  )
}

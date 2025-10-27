'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { SajuTestResponse } from '../lib/dto'

interface TestDetailPageProps {
  test: SajuTestResponse
  onBack: () => void
}

export function TestDetailPage({ test, onBack }: TestDetailPageProps) {
  const formattedDate = new Date(test.created_at).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>검사 상세 결과</CardTitle>
          <CardDescription>
            {test.test_name}님의 사주 분석 결과입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">검사 대상자</p>
              <p className="font-medium">{test.test_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">생년월일</p>
              <p className="font-medium">{test.birth_date}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">출생시간</p>
              <p className="font-medium">
                {test.is_birth_time_unknown
                  ? '정보 없음'
                  : test.birth_time
                    ? test.birth_time.substring(0, 5)
                    : '정보 없음'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">성별</p>
              <p className="font-medium">{test.gender === 'male' ? '남성' : '여성'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">검사 일시</p>
              <p className="font-medium">{formattedDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">사용 모델</p>
              <p className="font-medium text-xs">{test.model_used}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">상세 분석</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap leading-relaxed">
                {test.full_result || '분석 결과를 불러올 수 없습니다.'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

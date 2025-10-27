'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { TestDetailPage } from '@/features/saju/components/TestDetailPage'
import { useSajuTest } from '@/features/saju/hooks/useSajuAnalysis'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ testId: string }>
}

export default function TestDetailPageRoute({ params }: PageProps) {
  const router = useRouter()
  const { testId } = use(params)

  const { data: test, isLoading, error } = useSajuTest(testId, {
    refetchInterval: (query) => {
      // processing 상태일 경우 5초마다 폴링
      const data = query.state.data
      return data?.status === 'processing' ? 5000 : false
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">로딩 중...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>오류</CardTitle>
            <CardDescription>검사 결과를 찾을 수 없습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">
              검사 결과를 불러오는 중 오류가 발생했습니다.
            </p>
            <Button onClick={() => router.push('/dashboard')}>대시보드로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (test.status === 'processing') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 space-y-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-center text-muted-foreground">분석 진행 중입니다...</p>
            <p className="text-center text-xs text-muted-foreground">
              잠시만 기다려주세요. 페이지가 자동으로 업데이트됩니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (test.status === 'failed') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>분석 실패</CardTitle>
            <CardDescription>분석 중 오류가 발생했습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">
              {test.error_message || '분석 중 알 수 없는 오류가 발생했습니다.'}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                대시보드로 돌아가기
              </Button>
              <Button onClick={() => router.push('/dashboard/new')}>다시 검사하기</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <TestDetailPage test={test} onBack={() => router.push('/dashboard')} />
}

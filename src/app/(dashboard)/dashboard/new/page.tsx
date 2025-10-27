'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TestInputForm } from '@/features/saju/components/TestInputForm'
import { AnalysisResultModal } from '@/features/saju/components/AnalysisResultModal'
import { useAnalyzeSaju } from '@/features/saju/hooks/useSajuAnalysis'
import { useUserSubscription } from '@/features/dashboard/hooks/useUserSubscription'
import { extractApiErrorMessage } from '@/lib/remote/api-client'
import type { AnalyzeSajuRequest } from '@/features/saju/lib/dto'
import { useToast } from '@/hooks/use-toast'

interface ModalData {
  testId: string
  testName: string
  birthDate: string
  gender: 'male' | 'female'
  summary: string
}

export default function NewTestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const analyzeSaju = useAnalyzeSaju()
  const { data: subscription, isLoading: isLoadingSubscription } = useUserSubscription()
  const [modalData, setModalData] = useState<ModalData | null>(null)

  const handleSubmit = async (data: AnalyzeSajuRequest) => {
    try {
      const result = await analyzeSaju.mutateAsync(data)
      setModalData({
        testId: result.testId,
        testName: data.test_name,
        birthDate: data.birth_date,
        gender: data.gender,
        summary: result.summary,
      })
    } catch (error: unknown) {
      const message = extractApiErrorMessage(error, '검사 수행 중 오류가 발생했습니다')
      toast({
        variant: 'destructive',
        title: '검사 실패',
        description: message,
      })
    }
  }

  const handleCloseModal = () => {
    setModalData(null)
    router.push('/dashboard')
  }

  const handleViewDetail = () => {
    if (modalData) {
      router.push(`/dashboard/result/${modalData.testId}`)
    }
  }

  if (isLoadingSubscription) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <p className="text-center text-muted-foreground">로딩 중...</p>
      </div>
    )
  }

  const remainingTests = subscription?.remaining_tests ?? 0

  return (
    <div className="container mx-auto p-6">
      <TestInputForm
        onSubmit={handleSubmit}
        isLoading={analyzeSaju.isPending}
        remainingTests={remainingTests}
      />

      {modalData && (
        <AnalysisResultModal
          open={!!modalData}
          onClose={handleCloseModal}
          onViewDetail={handleViewDetail}
          testName={modalData.testName}
          birthDate={modalData.birthDate}
          gender={modalData.gender}
          summary={modalData.summary}
        />
      )}
    </div>
  )
}

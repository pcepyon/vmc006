'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyzeSajuRequest } from '../lib/dto'

const formSchema = z.object({
  test_name: z.string().min(2, '이름은 2자 이상이어야 합니다').max(50, '이름은 50자 이하여야 합니다'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다'),
  birth_time: z.string().optional(),
  is_birth_time_unknown: z.boolean().default(false),
  gender: z.enum(['male', 'female'], { message: '성별을 선택해주세요' }),
})

type FormData = z.infer<typeof formSchema>

interface TestInputFormProps {
  onSubmit: (data: AnalyzeSajuRequest) => void
  isLoading?: boolean
  remainingTests: number
}

export function TestInputForm({ onSubmit, isLoading, remainingTests }: TestInputFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      test_name: '',
      birth_date: '',
      birth_time: '',
      is_birth_time_unknown: false,
      gender: 'male',
    },
  })

  const isBirthTimeUnknown = form.watch('is_birth_time_unknown')

  const handleSubmit = (data: FormData) => {
    // HH:MM 형식을 HH:MM:SS로 변환
    const birthTime = data.birth_time && !isBirthTimeUnknown ? `${data.birth_time}:00` : undefined

    onSubmit({
      test_name: data.test_name,
      birth_date: data.birth_date,
      birth_time: birthTime,
      is_birth_time_unknown: data.is_birth_time_unknown,
      gender: data.gender,
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>새 사주 검사</CardTitle>
        <CardDescription>
          검사 대상자의 정보를 입력해주세요.{' '}
          <span className="font-semibold">잔여 검사 횟수: {remainingTests}회</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="test_name">검사 대상자 이름 *</Label>
            <Input
              id="test_name"
              placeholder="홍길동"
              {...form.register('test_name')}
              disabled={isLoading}
            />
            {form.formState.errors.test_name && (
              <p className="text-sm text-destructive">{form.formState.errors.test_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">생년월일 *</Label>
            <Input
              id="birth_date"
              type="date"
              {...form.register('birth_date')}
              disabled={isLoading}
            />
            {form.formState.errors.birth_date && (
              <p className="text-sm text-destructive">{form.formState.errors.birth_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_time">출생시간</Label>
            <Input
              id="birth_time"
              type="time"
              {...form.register('birth_time')}
              disabled={isBirthTimeUnknown || isLoading}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="birth_time_unknown"
                checked={isBirthTimeUnknown}
                onCheckedChange={(checked) => {
                  form.setValue('is_birth_time_unknown', !!checked)
                  if (checked) {
                    form.setValue('birth_time', '')
                  }
                }}
                disabled={isLoading}
              />
              <Label
                htmlFor="birth_time_unknown"
                className="text-sm font-normal cursor-pointer"
              >
                정확한 출생시간을 모릅니다
              </Label>
            </div>
            {form.formState.errors.birth_time && (
              <p className="text-sm text-destructive">{form.formState.errors.birth_time.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>성별 *</Label>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="gender-male"
                  value="male"
                  {...form.register('gender')}
                  disabled={isLoading}
                  className="h-4 w-4"
                />
                <Label htmlFor="gender-male" className="font-normal cursor-pointer">
                  남성
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="gender-female"
                  value="female"
                  {...form.register('gender')}
                  disabled={isLoading}
                  className="h-4 w-4"
                />
                <Label htmlFor="gender-female" className="font-normal cursor-pointer">
                  여성
                </Label>
              </div>
            </div>
            {form.formState.errors.gender && (
              <p className="text-sm text-destructive">{form.formState.errors.gender.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isLoading || remainingTests === 0} className="w-full">
            {isLoading ? '분석 중...' : '검사 시작'}
          </Button>

          {remainingTests === 0 && (
            <p className="text-sm text-destructive text-center mt-4">
              잔여 횟수가 없습니다. 구독을 업그레이드해주세요.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

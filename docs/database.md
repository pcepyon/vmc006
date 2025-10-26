# 데이터베이스 설계 문서

## 개요

사주 분석 웹앱의 데이터베이스 스키마 설계입니다. PostgreSQL(Supabase)을 사용하며, 유저플로우에 명시된 기능을 위한 최소 스펙으로 설계되었습니다.

## 데이터플로우

### 1. 사용자 인증 및 초기화
```
[Clerk 회원가입/로그인]
    ↓
[Webhook: user.created]
    ↓
[users 테이블 INSERT]
    - id (Clerk User ID)
    - email, name
    - subscription_tier: 'free'
    - remaining_tests: 3
```

### 2. 사주 검사 수행
```
[새 검사 요청]
    ↓
[users 조회: 잔여 횟수 확인]
    ↓
[saju_tests 테이블 INSERT]
    - 상태: 'processing'
    ↓
[AI 분석 (Gemini)]
    ↓
[saju_tests 테이블 UPDATE]
    - 상태: 'completed'
    - AI 결과 저장
    ↓
[users 테이블 UPDATE]
    - remaining_tests 차감
```

### 3. 구독 결제
```
[Pro 구독 신청]
    ↓
[토스 페이먼츠 빌링키 발급]
    ↓
[subscriptions 테이블 INSERT]
    - billing_key, customer_key
    - next_billing_date
    ↓
[users 테이블 UPDATE]
    - subscription_tier: 'pro'
    - remaining_tests: 10
```

### 4. 정기결제 자동화
```
[Supabase Cron 트리거]
    ↓
[오늘 결제일인 subscriptions 조회]
    ↓
[토스 페이먼츠 결제 API]
    ↓
성공 시:
    - payments 테이블 INSERT (SUCCESS)
    - subscriptions UPDATE (다음 결제일)
    - users UPDATE (remaining_tests: 10)
실패 시:
    - payments 테이블 INSERT (FAILED)
    - subscriptions UPDATE (status: 'expired')
    - users UPDATE (tier: 'free', tests: 0)
```

## 테이블 구조

### 1. users (사용자)
Clerk에서 관리되는 사용자와 1:1 매핑되는 테이블

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | TEXT | PRIMARY KEY | Clerk User ID (user_xxxx) |
| email | TEXT | NOT NULL, UNIQUE | 사용자 이메일 |
| name | TEXT | | 사용자 이름 |
| profile_image_url | TEXT | | 프로필 이미지 URL |
| subscription_tier | TEXT | DEFAULT 'free', CHECK IN ('free', 'pro') | 구독 등급 |
| remaining_tests | INTEGER | DEFAULT 3 | 잔여 검사 횟수 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 생성 시각 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 수정 시각 |

### 2. saju_tests (검사 결과)
사용자가 수행한 사주 검사 기록

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 검사 ID |
| user_id | TEXT | NOT NULL, REFERENCES users(id) | 사용자 ID |
| test_name | TEXT | NOT NULL | 검사 대상자 이름 |
| birth_date | DATE | NOT NULL | 생년월일 |
| birth_time | TIME | | 출생시간 (NULL = 모름) |
| is_birth_time_unknown | BOOLEAN | DEFAULT FALSE | 출생시간 모름 여부 |
| gender | TEXT | NOT NULL, CHECK IN ('male', 'female') | 성별 |
| status | TEXT | DEFAULT 'processing', CHECK IN ('processing', 'completed', 'failed') | 검사 상태 |
| ai_model | TEXT | NOT NULL | 사용된 AI 모델 (gemini-2.5-flash/pro) |
| summary_result | TEXT | | AI 분석 요약 (모달용) |
| full_result | TEXT | | AI 분석 전체 결과 |
| error_message | TEXT | | 실패 시 에러 메시지 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 검사 시작 시각 |
| completed_at | TIMESTAMP WITH TIME ZONE | | 검사 완료 시각 |

### 3. subscriptions (구독)
Pro 요금제 구독 정보

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 구독 ID |
| user_id | TEXT | NOT NULL, UNIQUE, REFERENCES users(id) | 사용자 ID |
| customer_key | TEXT | UNIQUE | 토스 Customer Key (해지 시 NULL) |
| billing_key | TEXT | | 토스 빌링키 (해지 시 NULL) |
| card_company | TEXT | | 카드사 |
| card_number | TEXT | | 마스킹된 카드번호 |
| status | TEXT | DEFAULT 'active', CHECK IN ('active', 'cancelled', 'expired') | 구독 상태 |
| next_billing_date | DATE | | 다음 결제일 (expired 시 NULL) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 구독 시작일 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 수정 시각 |

### 4. payments (결제 내역)
정기결제 및 결제 시도 기록

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 결제 ID |
| user_id | TEXT | NOT NULL, REFERENCES users(id) | 사용자 ID |
| subscription_id | UUID | REFERENCES subscriptions(id) | 구독 ID |
| payment_key | TEXT | | 토스 결제키 |
| order_id | TEXT | NOT NULL, UNIQUE | 주문번호 |
| amount | INTEGER | NOT NULL | 결제 금액 |
| status | TEXT | NOT NULL, CHECK IN ('SUCCESS', 'FAILED', 'CANCELLED') | 결제 상태 |
| method | TEXT | DEFAULT 'billing' | 결제 방식 |
| error_code | TEXT | | 실패 시 에러코드 |
| error_message | TEXT | | 실패 시 에러메시지 |
| paid_at | TIMESTAMP WITH TIME ZONE | | 결제 완료 시각 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 생성 시각 |

## 인덱스 설계

### users 테이블
- `idx_users_email`: email 컬럼 (로그인 조회 최적화)
- `idx_users_subscription_tier`: subscription_tier 컬럼 (구독 상태별 조회)

### saju_tests 테이블
- `idx_saju_tests_user_id`: user_id 컬럼 (사용자별 검사 이력 조회)
- `idx_saju_tests_test_name`: test_name 컬럼 (검사자 이름 검색)
- `idx_saju_tests_created_at`: created_at 컬럼 (시간순 정렬)
- `idx_saju_tests_status`: status 컬럼 (미완료 검사 정리용)

### subscriptions 테이블
- `idx_subscriptions_user_id`: user_id 컬럼 (사용자 구독 조회)
- `idx_subscriptions_status`: status 컬럼 (활성 구독 필터링)
- `idx_subscriptions_next_billing_date`: next_billing_date 컬럼 (정기결제 대상 조회)

### payments 테이블
- `idx_payments_user_id`: user_id 컬럼 (사용자별 결제 내역)
- `idx_payments_subscription_id`: subscription_id 컬럼
- `idx_payments_order_id`: order_id 컬럼 (주문번호 조회)
- `idx_payments_status`: status 컬럼 (상태별 필터링)
- `idx_payments_paid_at`: paid_at 컬럼 (시간순 정렬)

## 트리거 및 함수

### 1. updated_at 자동 업데이트
모든 테이블의 updated_at 컬럼을 자동으로 현재 시각으로 업데이트

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 데이터 정합성 규칙

### 1. 사용자 삭제 시
- Clerk webhook을 통해 users 테이블에서 DELETE
- CASCADE: saju_tests, subscriptions, payments 자동 삭제

### 2. 구독 상태 관리
- 한 사용자당 하나의 활성 구독만 허용 (UNIQUE 제약)
- 구독 해지 시:
  - status를 'cancelled'로 변경
  - billing_key와 customer_key를 NULL로 설정 (빌링키 재사용 방지)
  - 다음 결제일까지 서비스 유지
- 만료 후 status를 'expired'로 변경

### 3. 검사 횟수 관리
- 검사 시작 시 remaining_tests 확인
- 검사 완료 시에만 차감
- 실패 시 롤백

### 4. 미완료 검사 정리
- status가 'processing'이고 30분 이상 경과한 레코드 정리
- 차감된 횟수 복구

## 보안 고려사항

1. **RLS 미사용**: 요구사항에 따라 Row Level Security는 사용하지 않음
2. **Service Role Key 사용**: 백엔드에서만 Supabase 접근
3. **Clerk JWT 검증**: 모든 API 요청 시 사용자 인증
4. **빌링키 보호**: billing_key는 백엔드에서만 접근 가능

## 성능 최적화

1. **인덱스 활용**: 자주 조회되는 컬럼에 인덱스 생성
2. **페이지네이션**: 검사 이력 조회 시 LIMIT/OFFSET 사용
3. **비동기 처리**: AI 분석은 비동기로 처리
4. **배치 처리**: 정기결제는 Cron으로 일괄 처리

## 마이그레이션 순서

1. users 테이블 생성
2. saju_tests 테이블 생성
3. subscriptions 테이블 생성
4. payments 테이블 생성
5. 인덱스 생성
6. 트리거 생성
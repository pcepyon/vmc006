# API 상세 문서

## 개요

사주 분석 웹앱의 RESTful API 문서입니다. Hono 프레임워크 기반이며 Clerk JWT 인증을 사용합니다.

## 기본 정보

- **Base URL**: `/api`
- **인증**: Bearer Token (Clerk JWT)
- **Content-Type**: `application/json`
- **응답 형식**: JSON

## 인증

모든 보호된 엔드포인트는 Authorization 헤더가 필요합니다:
```
Authorization: Bearer <clerk_jwt_token>
```

## 엔드포인트

### 1. 사주 분석

#### 1.1 새 검사 수행
```
POST /api/saju/analyze
```

**인증 필요**: ✅

**요청 본문**:
```json
{
  "test_name": "홍길동",
  "birth_date": "1990-01-01",
  "birth_time": "14:30:00",
  "is_birth_time_unknown": false,
  "gender": "male"
}
```

**응답 (200 OK)** - 동기 처리 완료:
```json
{
  "test_id": "uuid-here",
  "status": "completed",
  "summary_result": "요약 내용...",
  "message": "검사가 완료되었습니다"
}
```

**응답 (403 Forbidden)**:
```json
{
  "error": "NO_TESTS_REMAINING",
  "message": "잔여 검사 횟수가 없습니다"
}
```

**응답 (504 Gateway Timeout)**:
```json
{
  "error": "AI_TIMEOUT",
  "test_id": "uuid-here",
  "message": "AI 분석 시간이 초과되었습니다. 잠시 후 결과를 확인해주세요"
}
```

**처리 흐름**:
1. JWT에서 user_id 추출
2. users 테이블에서 remaining_tests 확인
3. saju_tests 테이블에 레코드 생성 (status: 'processing')
4. remaining_tests 즉시 차감 (롤백 방지)
5. AI 모델 선택 (free→flash, pro→pro)
6. Gemini API 호출 (타임아웃: 30초)
7. 성공: 결과 저장 후 즉시 반환
8. 타임아웃: test_id 반환, 백그라운드 계속 처리

---

#### 1.2 검사 결과 조회
```
GET /api/saju/tests/{test_id}
```

**인증 필요**: ✅

**용도**: AI 분석이 타임아웃된 경우, 이 API로 처리 상태를 확인

**응답 (200 OK)** - 처리 중:
```json
{
  "id": "uuid-here",
  "test_name": "홍길동",
  "status": "processing",
  "message": "분석 진행 중입니다"
}
```

**응답 (200 OK)** - 완료:
```json
{
  "id": "uuid-here",
  "test_name": "홍길동",
  "birth_date": "1990-01-01",
  "birth_time": "14:30:00",
  "gender": "male",
  "status": "completed",
  "summary_result": "요약 내용...",
  "full_result": "전체 분석 내용...",
  "created_at": "2025-01-26T10:00:00Z",
  "completed_at": "2025-01-26T10:01:00Z"
}
```

---

#### 1.3 검사 이력 목록
```
GET /api/saju/tests?page=1&limit=10&search=홍길동
```

**인증 필요**: ✅

**쿼리 파라미터**:
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 10, 최대: 50)
- `search`: 검사자 이름 검색

**응답 (200 OK)**:
```json
{
  "tests": [
    {
      "id": "uuid-here",
      "test_name": "홍길동",
      "birth_date": "1990-01-01",
      "gender": "male",
      "status": "completed",
      "created_at": "2025-01-26T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

---

### 2. 구독 관리

#### 2.1 구독 정보 조회
```
GET /api/subscription
```

**인증 필요**: ✅

**응답 (200 OK)** - Pro 구독자:
```json
{
  "subscription_tier": "pro",
  "remaining_tests": 7,
  "subscription": {
    "status": "active",
    "next_billing_date": "2025-02-26",
    "card_company": "신한카드",
    "card_number": "433012******1234"
  }
}
```

**응답 (200 OK)** - 무료 사용자:
```json
{
  "subscription_tier": "free",
  "remaining_tests": 2,
  "subscription": null
}
```

**응답 (200 OK)** - 구독 해지 예정:
```json
{
  "subscription_tier": "pro",
  "remaining_tests": 5,
  "subscription": {
    "status": "cancelled",
    "next_billing_date": "2025-02-26",
    "card_company": "신한카드",
    "card_number": "433012******1234",
    "message": "2025-02-26까지 이용 가능"
  }
}
```

---

#### 2.2 빌링키 발급 확정
```
POST /api/subscription/billing/confirm
```

**인증 필요**: ✅

**요청 본문**:
```json
{
  "customer_key": "uuid-here",
  "auth_key": "toss-auth-key"
}
```

**응답 (200 OK)**:
```json
{
  "message": "구독이 완료되었습니다",
  "subscription_tier": "pro",
  "remaining_tests": 10
}
```

**처리 흐름**:
1. 토스 페이먼츠 빌링키 발급 API 호출
2. subscriptions 테이블에 저장
3. users 테이블 업데이트 (tier: 'pro', tests: 10)

---

#### 2.3 구독 취소
```
POST /api/subscription/cancel
```

**인증 필요**: ✅

**응답 (200 OK)**:
```json
{
  "message": "구독이 취소되었습니다. 다음 결제일까지 이용 가능합니다",
  "expiry_date": "2025-02-26"
}
```

**처리 흐름**:
1. 활성 구독 조회
2. subscriptions 테이블 업데이트:
   - status: 'cancelled'
   - billing_key: NULL (빌링키 삭제)
   - customer_key: NULL (고객키 삭제)
3. 다음 결제일까지 Pro 서비스 유지

---

#### 2.4 구독 재활성화
```
POST /api/subscription/reactivate
```

**인증 필요**: ✅

**주의사항**: 빌링키가 이미 NULL로 처리된 경우, 재활성화 불가능. 새로운 구독 신청 필요.

**응답 (200 OK)**:
```json
{
  "message": "구독이 재활성화되었습니다",
  "next_billing_date": "2025-02-26"
}
```

**응답 (400 Bad Request)**:
```json
{
  "error": "BILLING_KEY_DELETED",
  "message": "빌링키가 삭제되어 재활성화할 수 없습니다. 새로 구독을 신청해주세요"
}
```

**응답 (400 Bad Request)**:
```json
{
  "error": "SUBSCRIPTION_EXPIRED",
  "message": "구독 기간이 만료되어 재활성화할 수 없습니다"
}
```

---

### 3. 정기결제 (Cron)

#### 3.1 정기결제 트리거
```
POST /api/subscription/billing/cron
```

**인증**: X-Cron-Secret 헤더 검증

**헤더**:
```
X-Cron-Secret: your-cron-secret-token
```

**요청 본문**:
```json
{
  "timestamp": "2025-01-26T02:00:00Z"
}
```

**응답 (200 OK)**:
```json
{
  "message": "Cron job completed",
  "results": [
    {"user_id": "user_xxx", "status": "success"},
    {"user_id": "user_yyy", "status": "failed", "error": "카드 한도 초과"}
  ]
}
```

**응답 (409 Conflict)** - 이미 처리됨:
```json
{
  "error": "ALREADY_PROCESSED",
  "message": "오늘 날짜의 정기결제가 이미 처리되었습니다"
}
```

**처리 흐름**:
1. Secret Token 검증
2. **오늘 날짜 결제 처리 여부 확인** (payments 테이블에서 오늘 날짜 SUCCESS 레코드 확인)
3. 오늘이 결제일인 active 구독 조회
4. 각 구독별 토스 페이먼츠 결제 API 호출
5. 성공: payments 기록, 구독 연장, 횟수 초기화
6. 실패: payments 실패 기록, 구독 해지

**멱등성 보장**: 같은 날짜에 여러 번 호출되어도 한 번만 처리됨

---

### 4. 사용자 정보

#### 4.1 대시보드 정보
```
GET /api/user/dashboard
```

**인증 필요**: ✅

**응답 (200 OK)**:
```json
{
  "user": {
    "id": "user_xxx",
    "email": "user@example.com",
    "name": "홍길동",
    "subscription_tier": "pro",
    "remaining_tests": 7
  },
  "recent_tests": [
    {
      "id": "uuid-here",
      "test_name": "김철수",
      "created_at": "2025-01-25T15:00:00Z"
    }
  ],
  "stats": {
    "total_tests": 15,
    "this_month_tests": 3
  }
}
```

---

## 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| UNAUTHORIZED | 401 | 인증 토큰 없음 또는 유효하지 않음 |
| FORBIDDEN | 403 | 권한 없음 |
| NOT_FOUND | 404 | 리소스를 찾을 수 없음 |
| NO_TESTS_REMAINING | 403 | 잔여 검사 횟수 없음 |
| SUBSCRIPTION_REQUIRED | 403 | Pro 구독 필요 |
| SUBSCRIPTION_EXPIRED | 400 | 구독 만료됨 |
| PAYMENT_FAILED | 500 | 결제 실패 |
| AI_SERVICE_ERROR | 500 | AI 분석 서비스 오류 |
| VALIDATION_ERROR | 400 | 입력 데이터 유효성 검증 실패 |

---

## 공통 응답 형식

### 성공 응답
```json
{
  "data": {...},
  "message": "성공 메시지"
}
```

### 에러 응답
```json
{
  "error": "ERROR_CODE",
  "message": "사용자에게 표시할 메시지",
  "details": {...}  // 선택적, 디버깅용
}
```

---

## Rate Limiting

- 일반 API: 분당 60회
- AI 분석 API: 분당 10회
- 정기결제 Cron: 일 1회

---

## Webhook 엔드포인트

### Clerk Webhook
```
POST /api/webhooks/clerk
```

**이벤트 처리**:
- `user.created`: users 테이블에 신규 사용자 생성
- `user.updated`: 사용자 정보 업데이트
- `user.deleted`: 사용자 및 관련 데이터 삭제

### 토스 페이먼츠 Webhook (선택)
```
POST /api/webhooks/toss
```

**이벤트 처리**:
- `PAYMENT_STATUS_CHANGED`: 결제 상태 변경
- `BILLING_DELETED`: 빌링키 삭제

---

## 미들웨어 체인

모든 API 요청은 다음 순서로 미들웨어를 거칩니다:

1. **errorBoundary**: 전역 에러 처리
2. **withAppContext**: 로거, 설정 주입
3. **withClerk**: JWT 검증 및 user_id 추출
4. **withSupabase**: Supabase 클라이언트 주입
5. **requireAuth**: 인증 필수 라우트 보호 (선택적)

---

## 테스트 환경

### 테스트 API Keys
- Clerk: `test_sk_` 프리픽스
- 토스 페이먼츠: `test_sk_` 프리픽스

### 테스트 데이터
- 테스트 카드번호: `4330120000000000`
- 테스트 user_id: `user_test_123`

---

## 배포 체크리스트

- [ ] 환경변수 설정 완료
- [ ] Clerk JWT 검증 활성화
- [ ] Supabase 연결 확인
- [ ] 토스 페이먼츠 API Key 설정
- [ ] Cron Secret Token 설정
- [ ] Rate Limiting 설정
- [ ] CORS 설정
- [ ] 에러 로깅 설정
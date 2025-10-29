[goal]

현재 코드베이스에 있는 오류를 파악하기 위한 제안을 평가하세요. 실현 가능한 방법인지, 다른 코드에 영향을 주지 않을 지 오류 없이 수정이 가능한 지 스타트업 cto의 관점에서 평가하세요. toss sdk 설치방법은 https://docs.tosspayments.com/llms.txt 을 참고하세요.
---
[현재 콘솔 오류 메세지]

TossPayments initialized: {methods: Array(3), hasRequestBillingAuth: true, hasRequestPayment: true, hasCancelPayment: true}
useTossPayments.ts:23 TossPayments initialized: {methods: Array(3), hasRequestBillingAuth: true, hasRequestPayment: true, hasCancelPayment: true}
useTossPayments.ts:56 Requesting billing auth with params: {customerKey: '7451d978-894a-4da0-809f-77299ea8f4ab', successUrl: 'http://localhost:3000/subscription/billing/success?customerKey=7451d978-894a-4da0-809f-77299ea8f4ab', failUrl: 'http://localhost:3000/subscription/billing/fail', customerEmail: 'pcepyon@gmail.com', customerName: 'Wonhyuk Choi'}
useTossPayments.ts:81 Calling requestBillingAuth with: {method: 'CARD', successUrl: 'http://localhost:3000/subscription/billing/success?customerKey=7451d978-894a-4da0-809f-77299ea8f4ab', failUrl: 'http://localhost:3000/subscription/billing/fail', customerKey: '7451d978-894a-4da0-809f-77299ea8f4ab', customerEmail: 'pcepyon@gmail.com', …}
useTossPayments.ts:88 Billing auth request error: TypeError: Cannot read properties of undefined (reading 'customerKey')
    at Proxy.<anonymous> (v1:8:576695)
    at h (v1:1:37751)
    at Generator.<anonymous> (v1:1:39066)
    at Generator.next (v1:1:38161)
    at v1:8:1791
    at new Promise (<anonymous>)
    at kx (v1:8:1571)
    at Proxy.value (v1:8:576537)
    at Object.apply (v1:8:17912)
    at v1:17:3343
    at h (v1:1:37751)
    at Generator.<anonymous> (v1:1:39066)
    at Generator.next (v1:1:38161)
    at n (v1:1:887)
    at s (v1:1:1090)
    at v1:1:1149
    at new Promise (<anonymous>)
    at Object.<anonymous> (v1:1:1030)
    at Object.requestBillingAuth (v1:17:3735)
    at requestBillingAuth (useTossPayments.ts:84:37)
    at handleIssueBillingKey (page.tsx:42:13)
    at executeDispatch (react-dom-client.development.js:16970:9)
    at runWithFiberInDEV (react-dom-client.development.js:871:30)
    at processDispatchQueue (react-dom-client.development.js:17020:19)
    at react-dom-client.development.js:17621:9
    at batchedUpdates$1 (react-dom-client.development.js:3311:40)
    at dispatchEventForPluginEventSystem (react-dom-client.development.js:17174:7)
    at dispatchEvent (react-dom-client.development.js:21357:11)
    at dispatchDiscreteEvent (react-dom-client.development.js:21325:11)
error @ intercept-console-error.ts:44
requestBillingAuth @ useTossPayments.ts:88
await in requestBillingAuth
handleIssueBillingKey @ page.tsx:42
executeDispatch @ react-dom-client.development.js:16970
runWithFiberInDEV @ react-dom-client.development.js:871
processDispatchQueue @ react-dom-client.development.js:17020
(익명) @ react-dom-client.development.js:17621
batchedUpdates$1 @ react-dom-client.development.js:3311
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17174
dispatchEvent @ react-dom-client.development.js:21357
dispatchDiscreteEvent @ react-dom-client.development.js:21325
<button>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
_c @ button.tsx:46
react_stack_bottom_frame @ react-dom-client.development.js:23583
renderWithHooksAgain @ react-dom-client.development.js:6892
renderWithHooks @ react-dom-client.development.js:6804
updateForwardRef @ react-dom-client.development.js:8806
beginWork @ react-dom-client.development.js:11196
runWithFiberInDEV @ react-dom-client.development.js:871
performUnitOfWork @ react-dom-client.development.js:15726
workLoopSync @ react-dom-client.development.js:15546
renderRootSync @ react-dom-client.development.js:15526
performWorkOnRoot @ react-dom-client.development.js:14990
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16815
performWorkUntilDeadline @ scheduler.development.js:45
<Button>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
BillingPageContent @ page.tsx:96
react_stack_bottom_frame @ react-dom-client.development.js:23583
renderWithHooksAgain @ react-dom-client.development.js:6892
renderWithHooks @ react-dom-client.development.js:6804
updateFunctionComponent @ react-dom-client.development.js:9246
beginWork @ react-dom-client.development.js:10857
runWithFiberInDEV @ react-dom-client.development.js:871
performUnitOfWork @ react-dom-client.development.js:15726
workLoopSync @ react-dom-client.development.js:15546
renderRootSync @ react-dom-client.development.js:15526
performWorkOnRoot @ react-dom-client.development.js:14990
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16815
performWorkUntilDeadline @ scheduler.development.js:45
<BillingPageContent>
exports.jsxDEV @ react-jsx-dev-runtime.development.js:323
BillingPage @ page.tsx:118
react_stack_bottom_frame @ react-dom-client.development.js:23583
renderWithHooksAgain @ react-dom-client.development.js:6892
renderWithHooks @ react-dom-client.development.js:6804
updateFunctionComponent @ react-dom-client.development.js:9246
beginWork @ react-dom-client.development.js:10857
runWithFiberInDEV @ react-dom-client.development.js:871
performUnitOfWork @ react-dom-client.development.js:15726
workLoopConcurrentByScheduler @ react-dom-client.development.js:15720
renderRootConcurrent @ react-dom-client.development.js:15695
performWorkOnRoot @ react-dom-client.development.js:14989
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16815
performWorkUntilDeadline @ scheduler.development.js:45
<BillingPage>
exports.jsx @ react-jsx-runtime.development.js:323
ClientPageRoot @ client-page.tsx:60
react_stack_bottom_frame @ react-dom-client.development.js:23583
renderWithHooksAgain @ react-dom-client.development.js:6892
renderWithHooks @ react-dom-client.development.js:6804
updateFunctionComponent @ react-dom-client.development.js:9246
beginWork @ react-dom-client.development.js:10806
runWithFiberInDEV @ react-dom-client.development.js:871
performUnitOfWork @ react-dom-client.development.js:15726
workLoopConcurrentByScheduler @ react-dom-client.development.js:15720
renderRootConcurrent @ react-dom-client.development.js:15695
performWorkOnRoot @ react-dom-client.development.js:14989
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16815
performWorkUntilDeadline @ scheduler.development.js:45
"use client"
Function.all @ VM50 <anonymous>:1
initializeElement @ react-server-dom-turbopack-client.browser.development.js:1332
"use server"
ResponseInstance @ react-server-dom-turbopack-client.browser.development.js:2030
createResponseFromOptions @ react-server-dom-turbopack-client.browser.development.js:3083
exports.createFromReadableStream @ react-server-dom-turbopack-client.browser.development.js:3460
createFromNextReadableStream @ fetch-server-response.ts:388
fetchServerResponse @ fetch-server-response.ts:216
await in fetchServerResponse
(익명) @ prefetch-cache-utils.ts:323
task @ promise-queue.ts:33
processNext @ promise-queue.ts:66
enqueue @ promise-queue.ts:46
createLazyPrefetchEntry @ prefetch-cache-utils.ts:322
getOrCreatePrefetchCacheEntry @ prefetch-cache-utils.ts:227
navigateReducer @ navigate-reducer.ts:216
clientReducer @ router-reducer.ts:32
action @ app-router-instance.ts:221
runAction @ app-router-instance.ts:108
dispatchAction @ app-router-instance.ts:173
dispatch @ app-router-instance.ts:219
(익명) @ use-action-queue.ts:45
startTransition @ react-dom-client.development.js:7967
dispatch @ use-action-queue.ts:44
dispatchAppRouterAction @ use-action-queue.ts:22
dispatchNavigateAction @ app-router-instance.ts:290
(익명) @ app-router-instance.ts:392
exports.startTransition @ react.development.js:1148
push @ app-router-instance.ts:391
handleUpgrade @ page.tsx:41
executeDispatch @ react-dom-client.development.js:16970
runWithFiberInDEV @ react-dom-client.development.js:871
processDispatchQueue @ react-dom-client.development.js:17020
(익명) @ react-dom-client.development.js:17621
batchedUpdates$1 @ react-dom-client.development.js:3311
dispatchEventForPluginEventSystem @ react-dom-client.development.js:17174
dispatchEvent @ react-dom-client.development.js:21357
dispatchDiscreteEvent @ react-dom-client.development.js:21325이 오류 이해하기
useTossPayments.ts:89 Error details: {message: "Cannot read properties of undefined (reading 'customerKey')", code: undefined, stack: 'TypeError: Cannot read properties of undefined (re…t_dist_compiled_react-dom_1e674e59._.js:11206:64)'}

---
[코드 수정을 위한 제안]
⏺ 🔧 Toss Payments 구현 문제 분석 및 
  수정 계획

  📋 문제점 파악

  현재 코드의 주요 문제점들을
  확인했습니다:

  1. 잘못된 SDK 사용 패턴
    - 현재: tossPayments.requestBilling
  Auth(params) 직접 호출
    - 정답: tossPayments.payment({ 
  customerKey
  }).requestBillingAuth(params) 사용
  필요
  2. 필수 파라미터 누락
    - orderId: 주문 고유 ID (6-64자)
    - orderName: 주문명 (최대 100자)
    - amount: 결제 금액 객체 ({ value, 
  currency })
  3. SDK 초기화 방식 오류
    - payment 객체를 먼저 생성하지 않고
   직접 메서드 호출 시도

  🛠️ 수정 계획

  Step 1: useTossPayments.ts 수정

  // 수정 필요 사항:
  1. requestBillingAuth 메서드를
  payment 객체를 통해 호출하도록 변경
  2. 필수 파라미터 추가 (orderId,
  orderName, amount)
  3. payment 객체 생성 로직 추가

  Step 2: billing/page.tsx 수정

  // 수정 필요 사항:
  1. orderId 생성 로직 추가 (예:
  timestamp + random string)
  2. orderName과 amount 값 설정
  3. 파라미터 전달 방식 수정

  Step 3: 파라미터 검증 강화

  // 추가할 검증:
  1. customerKey 형식 검증 (2-50자,
  특수문자 제한)
  2. orderId 고유성 보장
  3. amount 값 유효성 검증

  📝 구체적인 수정 내용

  1. useTossPayments.ts 수정 방향

  const requestBillingAuth = async
  (params: {
    customerKey: string;
    orderId: string;
    orderName: string;
    amount: { value: number; currency:
  string };
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }) => {
    // payment 객체 생성
    const payment =
  tossPaymentsRef.current.payment({
      customerKey: params.customerKey
    });

    // requestBillingAuth 호출
    await payment.requestBillingAuth({
      method: 'CARD',
      orderId: params.orderId,
      orderName: params.orderName,
      amount: params.amount,
      successUrl: params.successUrl,
      failUrl: params.failUrl,
      customerEmail:
  params.customerEmail,
      customerName:
  params.customerName,
    });
  };

  2. billing/page.tsx 수정 방향

  const handleIssueBillingKey = async
  () => {
    // orderId 생성
    const orderId =
  `BILLING_${Date.now()}_${Math.random(
  ).toString(36).substring(2, 9)}`;

    await requestBillingAuth({
      customerKey,
      orderId,
      orderName: '구독 서비스 카드 
  등록',
      amount: {
        value: 0,  // 빌링키 발급시에는
   0원으로 설정
        currency: 'KRW'
      },
      successUrl: `${window.location.or
  igin}/subscription/billing/success?cu
  stomerKey=${customerKey}`,
      failUrl: `${window.location.origi
  n}/subscription/billing/fail`,
      customerEmail: user?.primaryEmail
  Address?.emailAddress,
      customerName: user?.fullName ||
  user?.username,
    });
  };

  ✅ 예상 결과

  1. 정상적인 SDK 호출
    - payment 객체를 통한 올바른 메서드
   호출
    - 모든 필수 파라미터 포함
  2. 에러 해결
    - Cannot read properties of 
  undefined 오류 해결
    - 결제창 정상 표시
  3. 향후 개선 사항
    - 에러 핸들링 강화
    - 재시도 로직 추가
    - 로깅 개선

  이제 이 계획에 따라 코드를
  수정하시겠습니까? 수정을 진행하면
  정확한 코드 변경사항을
  제공하겠습니다.
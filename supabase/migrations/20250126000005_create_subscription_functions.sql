-- 빌링키 발급 시 구독 생성 + 사용자 업데이트 (원자성 보장)
-- 트랜잭션 함수를 통해 subscriptions INSERT와 users UPDATE를 원자적으로 처리
CREATE OR REPLACE FUNCTION create_subscription_with_user_update(
  p_user_id TEXT,
  p_customer_key TEXT,
  p_billing_key TEXT,
  p_card_company TEXT,
  p_card_number TEXT,
  p_next_billing_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- 1. subscriptions 테이블에 INSERT (UPSERT 방식 사용)
  INSERT INTO subscriptions (
    user_id, customer_key, billing_key,
    card_company, card_number,
    status, next_billing_date
  ) VALUES (
    p_user_id, p_customer_key, p_billing_key,
    p_card_company, p_card_number,
    'active', p_next_billing_date
  )
  ON CONFLICT (user_id) DO UPDATE SET
    customer_key = EXCLUDED.customer_key,
    billing_key = EXCLUDED.billing_key,
    card_company = EXCLUDED.card_company,
    card_number = EXCLUDED.card_number,
    status = 'active',
    next_billing_date = EXCLUDED.next_billing_date,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  -- 2. users 테이블 UPDATE (Pro 요금제로 업그레이드)
  UPDATE users
  SET subscription_tier = 'pro',
      remaining_tests = 10,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 3. 성공 응답 반환
  RETURN jsonb_build_object(
    'subscription_id', v_subscription_id,
    'status', 'success'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- 오류 발생 시 자동 롤백되고 예외를 상위로 전파
    RAISE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_subscription_with_user_update IS '빌링키 발급 시 구독 생성과 사용자 업데이트를 원자적으로 처리하는 트랜잭션 함수';

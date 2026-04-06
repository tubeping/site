-- ============================================================
-- 005_settlements.sql — 정산 시스템
-- ============================================================
-- 판매사(인플루언서) 정산조건 + 정산서 + 정산 상세
-- 발주모아 미사용, 자체 DB 기반 정산

-- ============================================================
-- 0. 기존 불완전한 테이블 제거 (최초 1회)
-- ============================================================
DROP TRIGGER IF EXISTS settlements_updated_at ON settlements;
DROP TABLE IF EXISTS settlement_items CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;

-- ============================================================
-- 1. 기존 테이블 확장
-- ============================================================

-- products: 공급배송비, 과세구분 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS supply_shipping_fee INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT '과세';

-- supplier_products: 공급배송비, 과세구분 추가
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS supply_shipping_fee INTEGER DEFAULT 0;
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT '과세';

-- orders: 결제 상세 추가 (카페24 API에서 수집)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount INTEGER;       -- 실결제금액 (할인 반영)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee INTEGER DEFAULT 0;  -- 고객 배송비
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;  -- 할인금액
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cafe24_order_status TEXT;     -- 카페24 주문상태 코드

-- stores: 정산 조건 추가 (판매사 = 스토어 기준)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS influencer_rate NUMERIC(5,2) DEFAULT 70.00;  -- 인플루언서 비율 %
ALTER TABLE stores ADD COLUMN IF NOT EXISTS company_rate NUMERIC(5,2) DEFAULT 30.00;     -- 회사 비율 %
ALTER TABLE stores ADD COLUMN IF NOT EXISTS settlement_type TEXT DEFAULT '사업자';        -- 사업자 / 프리랜서
ALTER TABLE stores ADD COLUMN IF NOT EXISTS pg_fee_rate NUMERIC(5,2) DEFAULT 3.74;       -- PG수수료율 %
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tpl_cost INTEGER DEFAULT 0;                  -- 3PL 물류비 (월)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS other_cost INTEGER DEFAULT 0;                -- 기타비용 (월)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS other_cost_label TEXT DEFAULT '기타비용';     -- 기타비용 명칭
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_holder TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_no TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- ============================================================
-- 2. settlements — 정산 헤더 (판매사별 월별 1건)
-- ============================================================
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_no TEXT NOT NULL UNIQUE,              -- STL-202603-001

  store_id UUID NOT NULL REFERENCES stores(id),    -- 판매사(스토어) 기준
  period TEXT NOT NULL,                            -- 2026-03
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- ── 매출 ──
  cafe24_sales INTEGER NOT NULL DEFAULT 0,         -- 자사몰 매출
  phone_sales INTEGER NOT NULL DEFAULT 0,          -- 전화주문 매출
  refund_amount INTEGER NOT NULL DEFAULT 0,        -- 환불/반품 합계 (음수)
  total_sales INTEGER NOT NULL DEFAULT 0,          -- 순매출

  -- ── 비용 ──
  pg_fee INTEGER NOT NULL DEFAULT 0,               -- PG수수료
  cogs_taxable INTEGER NOT NULL DEFAULT 0,         -- 제품원가 (과세)
  cogs_exempt INTEGER NOT NULL DEFAULT 0,          -- 제품원가 (면세 원가)
  cogs_exempt_vat INTEGER NOT NULL DEFAULT 0,      -- 제품원가 (면세 VAT 10%)
  total_cogs INTEGER NOT NULL DEFAULT 0,           -- 제품원가 합계
  ship_taxable INTEGER NOT NULL DEFAULT 0,         -- 공급배송비 (과세)
  ship_exempt INTEGER NOT NULL DEFAULT 0,          -- 공급배송비 (면세 원가)
  ship_exempt_vat INTEGER NOT NULL DEFAULT 0,      -- 공급배송비 (면세 VAT 10%)
  total_shipping INTEGER NOT NULL DEFAULT 0,       -- 공급배송비 합계
  tpl_cost INTEGER NOT NULL DEFAULT 0,             -- 3PL비용
  other_cost INTEGER NOT NULL DEFAULT 0,           -- 기타비용
  vat_amount INTEGER NOT NULL DEFAULT 0,           -- 부가세 (프리랜서만)
  total_cost INTEGER NOT NULL DEFAULT 0,           -- 총비용

  -- ── 순익 / 분배 ──
  net_profit INTEGER NOT NULL DEFAULT 0,
  profit_rate NUMERIC(5,1) DEFAULT 0,              -- 순익률 %
  influencer_amount INTEGER NOT NULL DEFAULT 0,    -- 인플루언서 정산금
  withholding_tax INTEGER NOT NULL DEFAULT 0,      -- 원천세 3.3% (프리랜서)
  influencer_actual INTEGER NOT NULL DEFAULT 0,    -- 인플루언서 실지급액
  company_amount INTEGER NOT NULL DEFAULT 0,       -- 회사 정산금

  -- ── 정산 조건 스냅샷 (계산 시점 저장) ──
  snap_influencer_rate NUMERIC(5,2),
  snap_company_rate NUMERIC(5,2),
  snap_settlement_type TEXT,
  snap_pg_fee_rate NUMERIC(5,2),

  -- ── 상태 ──
  status TEXT NOT NULL DEFAULT 'draft',            -- draft / confirmed / paid
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- ── 통계 ──
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,

  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNIQUE: 같은 스토어+기간에 정산서 1개만
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_store_period
  ON settlements(store_id, period);

-- ============================================================
-- 3. settlement_items — 정산 상세 (주문 아이템별 1건)
-- ============================================================
CREATE TABLE IF NOT EXISTS settlement_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),

  -- 주문 정보 스냅샷
  cafe24_order_id TEXT,
  cafe24_order_item_code TEXT,
  order_date DATE,
  product_name TEXT,
  option_text TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- 매출
  product_price INTEGER NOT NULL DEFAULT 0,        -- 상품 단가
  order_amount INTEGER NOT NULL DEFAULT 0,         -- 주문금액 (단가×수량)
  shipping_fee INTEGER NOT NULL DEFAULT 0,         -- 고객 배송비
  discount_amount INTEGER NOT NULL DEFAULT 0,      -- 할인금액
  settled_amount INTEGER NOT NULL DEFAULT 0,       -- 정산매출 (최종 금액)

  -- 원가
  supply_price INTEGER NOT NULL DEFAULT 0,         -- 공급가 단가
  supply_total INTEGER NOT NULL DEFAULT 0,         -- 공급가 합계 (단가×수량)
  supply_shipping INTEGER NOT NULL DEFAULT 0,      -- 공급 배송비
  tax_type TEXT DEFAULT '과세',                    -- 과세 / 면세

  -- 분류
  item_type TEXT NOT NULL DEFAULT '매출',           -- 매출 / 반품 / 취소

  -- 참조
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  store_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement
  ON settlement_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_order
  ON settlement_items(order_id);

-- ============================================================
-- 4. 트리거
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'settlements_updated_at') THEN
    CREATE TRIGGER settlements_updated_at
      BEFORE UPDATE ON settlements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================
-- 5. 정산번호 자동 생성 함수
-- ============================================================
CREATE OR REPLACE FUNCTION generate_settlement_no(p_period TEXT)
RETURNS TEXT AS $$
DECLARE
  seq INTEGER;
  prefix TEXT;
BEGIN
  prefix := 'STL-' || REPLACE(p_period, '-', '');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(settlement_no FROM LENGTH(prefix) + 2) AS INTEGER)
  ), 0) + 1
  INTO seq
  FROM settlements
  WHERE settlement_no LIKE prefix || '-%';
  RETURN prefix || '-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON settlements(period);
CREATE INDEX IF NOT EXISTS idx_settlements_store ON settlements(store_id);

-- ============================================================
-- 7. RLS
-- ============================================================
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on settlements" ON settlements;
CREATE POLICY "Service role full access on settlements"
  ON settlements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on settlement_items" ON settlement_items;
CREATE POLICY "Service role full access on settlement_items"
  ON settlement_items FOR ALL USING (true) WITH CHECK (true);

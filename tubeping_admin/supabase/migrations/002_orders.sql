-- TubePing 주문 관리 + 공급사 허브 테이블
-- Supabase Dashboard → SQL Editor에서 실행
-- 선행: 001_products.sql (stores, products 테이블 필요)

-- ============================================================
-- 1. suppliers (공급사)
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                        -- 공급사명
  contact_name TEXT,                         -- 담당자명
  email TEXT NOT NULL,                       -- 발주서 수신 이메일
  phone TEXT,                                -- 연락처
  business_no TEXT,                          -- 사업자번호
  memo TEXT,                                 -- 메모
  status TEXT NOT NULL DEFAULT 'active',     -- active/inactive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. supplier_products (공급사 ↔ 상품 매핑)
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_product_code TEXT,                -- 공급사 자체 상품코드
  supply_price INTEGER NOT NULL DEFAULT 0,   -- 이 공급사의 공급가
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(supplier_id, product_id)
);

-- ============================================================
-- 3. orders (카페24에서 수집한 주문)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),           -- 어느 카페24 몰 주문인지
  cafe24_order_id TEXT NOT NULL,                           -- 카페24 주문번호
  cafe24_order_item_code TEXT,                             -- 카페24 품주코드
  order_date TIMESTAMPTZ NOT NULL,                        -- 주문일시
  buyer_name TEXT,                                        -- 주문자
  buyer_email TEXT,
  buyer_phone TEXT,
  receiver_name TEXT,                                     -- 수령자
  receiver_phone TEXT,
  receiver_address TEXT,                                  -- 배송지
  receiver_zipcode TEXT,

  -- 상품 정보
  product_id UUID REFERENCES products(id),                -- TubePing 자체 상품 (매핑된 경우)
  cafe24_product_no INTEGER,                              -- 카페24 상품번호
  product_name TEXT NOT NULL,                             -- 상품명
  option_text TEXT,                                       -- 옵션 (색상/사이즈 등)
  quantity INTEGER NOT NULL DEFAULT 1,
  product_price INTEGER NOT NULL DEFAULT 0,               -- 상품 단가
  order_amount INTEGER NOT NULL DEFAULT 0,                -- 주문 금액 (단가 × 수량)

  -- 공급사 / 발주
  supplier_id UUID REFERENCES suppliers(id),              -- 공급사
  purchase_order_id UUID,                                 -- 발주서 ID (나중에 FK 추가)

  -- 배송
  shipping_company TEXT,                                  -- 택배사
  tracking_number TEXT,                                   -- 송장번호
  shipping_status TEXT NOT NULL DEFAULT 'pending',        -- pending/ordered/shipping/delivered/cancelled
  shipped_at TIMESTAMPTZ,                                 -- 발송일

  -- 카페24 연동
  cafe24_shipping_synced BOOLEAN NOT NULL DEFAULT FALSE,  -- 카페24에 송장 연동 완료 여부
  cafe24_shipping_synced_at TIMESTAMPTZ,

  -- 메타
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, cafe24_order_id, cafe24_order_item_code)  -- 중복 수집 방지
);

-- ============================================================
-- 4. purchase_orders (발주서 — 공급사별로 주문 묶음)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,                         -- 발주번호 (PO-20260403-001)
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,          -- 발주일
  total_items INTEGER NOT NULL DEFAULT 0,                 -- 총 상품 수
  total_amount INTEGER NOT NULL DEFAULT 0,                -- 총 금액 (공급가 기준)

  -- 공급사 접속
  access_password TEXT NOT NULL,                          -- 4자리 접속 비밀번호
  access_expires_at TIMESTAMPTZ,                          -- 접속 만료일

  -- 상태
  status TEXT NOT NULL DEFAULT 'draft',                   -- draft/sent/viewed/completed/cancelled
  sent_at TIMESTAMPTZ,                                    -- 메일 발송일시
  viewed_at TIMESTAMPTZ,                                  -- 공급사 열람일시
  completed_at TIMESTAMPTZ,                               -- 송장 등록 완료일시

  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders.purchase_order_id FK 추가
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_purchase_order
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);

-- ============================================================
-- 5. shipment_uploads (공급사 송장 업로드 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  file_name TEXT NOT NULL,                                -- 업로드 파일명
  total_rows INTEGER NOT NULL DEFAULT 0,                  -- 전체 행 수
  success_rows INTEGER NOT NULL DEFAULT 0,                -- 성공 행 수
  error_rows INTEGER NOT NULL DEFAULT 0,                  -- 실패 행 수
  error_details JSONB,                                    -- 행별 에러 내용
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. 트리거 — updated_at 자동 갱신
-- ============================================================
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. 발주번호 자동 생성 함수
-- ============================================================
CREATE OR REPLACE FUNCTION generate_po_number(po_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
  date_str TEXT;
  next_seq INTEGER;
BEGIN
  date_str := TO_CHAR(po_date, 'YYYYMMDD');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM LENGTH('PO-' || date_str || '-') + 1) AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || date_str || '-%';

  RETURN 'PO-' || date_str || '-' || LPAD(next_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_purchase_order_id ON orders(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_orders_cafe24_order_id ON orders(cafe24_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_cafe24_synced ON orders(cafe24_shipping_synced) WHERE cafe24_shipping_synced = FALSE;

CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_order_date ON purchase_orders(order_date);

-- ============================================================
-- 9. RLS 정책
-- ============================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on suppliers"
  ON suppliers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on supplier_products"
  ON supplier_products FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on orders"
  ON orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on purchase_orders"
  ON purchase_orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on shipment_uploads"
  ON shipment_uploads FOR ALL USING (true) WITH CHECK (true);

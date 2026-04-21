-- ============================================
-- TubePing Builder — DB Schema
-- Supabase SQL Editor에서 실행
-- 기존 테이블(products, orders, suppliers 등) 유지
-- ============================================

-- 1. creators (크리에이터 계정)
CREATE TABLE IF NOT EXISTS creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  shop_slug TEXT UNIQUE NOT NULL,
  portal_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  platform TEXT DEFAULT 'youtube',
  channel_url TEXT,
  subscriber_count INT DEFAULT 0,
  category TEXT,
  persona_tier TEXT DEFAULT 'emerging',
  persona JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. creator_shops (크리에이터 쇼핑몰 설정)
CREATE TABLE IF NOT EXISTS creator_shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  theme JSONB DEFAULT '{}',
  cover_url TEXT,
  profile_url TEXT,
  tagline TEXT,
  link_blocks JSONB DEFAULT '[]',
  custom_domain TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id)
);

-- 3. creator_picks (크리에이터가 큐레이션한 PICK)
CREATE TABLE IF NOT EXISTS creator_picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'tubeping_campaign',
  external_url TEXT,
  affiliate_code TEXT,
  display_order INT DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  curation_comment TEXT,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- 4. campaigns (공구 캠페인)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'proposed',
  type TEXT DEFAULT 'group_buy',
  target_gmv NUMERIC DEFAULT 0,
  actual_gmv NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 20,
  proposed_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ
);

-- 5. settlements (정산)
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  gross_gmv NUMERIC DEFAULT 0,
  creator_net NUMERIC DEFAULT 0,
  tubeping_net NUMERIC DEFAULT 0,
  tax_invoice_no TEXT,
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6-1. campaign_notifications (공구 오픈 알림 신청)
CREATE TABLE IF NOT EXISTS campaign_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  contact_email TEXT,
  contact_phone TEXT,
  notify_channel TEXT DEFAULT 'email', -- email | sms | kakao
  notify_at_open BOOLEAN DEFAULT true,
  notify_before_close BOOLEAN DEFAULT true,
  notified_at TIMESTAMPTZ, -- 발송 완료 시각
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, contact_email)
);

-- 7. reviews (큐레이션 리뷰)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  customer_hash TEXT,
  product_rating INT CHECK (product_rating BETWEEN 1 AND 5),
  product_comment TEXT,
  curation_rating INT CHECK (curation_rating BETWEEN 1 AND 5),
  curation_comment TEXT,
  would_rebuy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX IF NOT EXISTS idx_creators_slug ON creators(shop_slug);
CREATE INDEX IF NOT EXISTS idx_creators_email ON creators(email);
CREATE INDEX IF NOT EXISTS idx_creator_picks_creator ON creator_picks(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_reviews_creator ON reviews(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_notif_campaign ON campaign_notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_notif_notified ON campaign_notifications(notified_at) WHERE notified_at IS NULL;

-- ============================================
-- RLS (Row Level Security) — 기본 설정
-- ============================================
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_notifications ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (공개몰용)
CREATE POLICY "Public read creators" ON creators FOR SELECT USING (true);
CREATE POLICY "Public read creator_shops" ON creator_shops FOR SELECT USING (true);
CREATE POLICY "Public read creator_picks" ON creator_picks FOR SELECT USING (visible = true);
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
-- 알림 신청은 삽입만 허용 (개인정보 노출 방지)
CREATE POLICY "Public insert campaign_notifications" ON campaign_notifications FOR INSERT WITH CHECK (true);

-- Service role은 전체 접근 (서버 사이드)
-- anon key는 위 정책으로만 접근

-- ============================================
-- 테스트 데이터 삽입
-- ============================================
INSERT INTO creators (name, email, phone, shop_slug, platform, channel_url, subscriber_count, category, persona_tier)
VALUES (
  '귀빈정',
  'gwibinjeong@test.com',
  '010-1234-5678',
  'gwibinjeong',
  'youtube',
  'https://youtube.com/@gwibinjeong',
  85000,
  '푸드',
  'growing'
) ON CONFLICT (email) DO NOTHING;

-- creator_shops
INSERT INTO creator_shops (creator_id, tagline, link_blocks, cover_url, profile_url)
SELECT
  id,
  '26년 전통 맛집! 국산 재료로 정성껏 만든 먹거리',
  '[{"id":"l1","label":"YouTube 채널","url":"https://youtube.com/@gwibinjeong","icon":"▶️"},{"id":"l2","label":"Instagram","url":"https://instagram.com/gwibinjeong","icon":"📷"},{"id":"l3","label":"뉴스레터 구독","url":"#","icon":"✉️"},{"id":"l4","label":"공구 문의하기","url":"#","icon":"💬"}]'::JSONB,
  NULL,
  NULL
FROM creators WHERE shop_slug = 'gwibinjeong'
ON CONFLICT (creator_id) DO NOTHING;

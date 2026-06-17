import { supabaseAdmin } from "./supabase-server";

// tubeping 본 몰의 stores.id (캐싱). admin과 충돌 방지 위해 토큰은 직접 안 다룸.
const TUBEPING_STORE_ID = "ee9dde29-a936-4896-be35-7060389d8065";
const TUBEPING_MALL_ID = "tubeping";

type Cafe24Mapping = {
  cafe24_product_no: number | null;
  cafe24_product_code: string | null;
  seller_product_name: string | null;
  seller_image_url: string | null;
  seller_price: number | null;
  sync_status: string | null;
  last_sync_at: string | null;
};

const mappingCache = new Map<string, { value: Cafe24Mapping | null; ts: number }>();
const MAPPING_TTL = 5 * 60 * 1000; // 5분

/**
 * products.id → 카페24 매핑 정보 조회 (READ ONLY, admin 동기화 결과 활용)
 * admin이 product_cafe24_mappings 테이블을 관리하므로 site는 읽기만.
 */
export async function getCafe24MappingByProductId(
  productId: string
): Promise<Cafe24Mapping | null> {
  if (!productId) return null;
  const cached = mappingCache.get(productId);
  if (cached && Date.now() - cached.ts < MAPPING_TTL) return cached.value;

  const { data } = await supabaseAdmin
    .from("product_cafe24_mappings")
    .select(
      "cafe24_product_no, cafe24_product_code, seller_product_name, seller_image_url, seller_price, sync_status, last_sync_at"
    )
    .eq("product_id", productId)
    .eq("store_id", TUBEPING_STORE_ID)
    .eq("sync_status", "synced")
    .maybeSingle();

  const value = data as Cafe24Mapping | null;
  mappingCache.set(productId, { value, ts: Date.now() });
  return value;
}

/**
 * 카페24 상품 상세 페이지 URL 생성 (mall 도메인 + product_no)
 */
export function buildCafe24ProductUrl(cafe24ProductNo: number): string {
  return `https://${TUBEPING_MALL_ID}.cafe24.com/product/detail.html?product_no=${cafe24ProductNo}`;
}

/**
 * 한 번에: products.id → 상세페이지 URL
 */
export async function getCafe24DetailUrl(productId: string): Promise<string | null> {
  const mapping = await getCafe24MappingByProductId(productId);
  if (!mapping?.cafe24_product_no) return null;
  return buildCafe24ProductUrl(mapping.cafe24_product_no);
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

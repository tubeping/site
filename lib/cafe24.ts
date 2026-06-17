import { supabaseAdmin } from "./supabase-server";

type Cafe24Store = {
  mall_id: string;
  access_token: string | null;
  store_url: string | null;
};

type Cafe24Product = {
  product_no: number;
  product_name: string;
  summary_description: string | null;
  simple_description: string | null;
  description: string | null;
  product_tag: string | null;
  detail_image: string | null;
  list_image: string | null;
  tiny_image: string | null;
  small_image: string | null;
};

let cachedStore: Cafe24Store | null = null;
let cachedStoreAt = 0;
const STORE_TTL = 5 * 60 * 1000; // 5분

async function getCafe24Store(): Promise<Cafe24Store | null> {
  if (cachedStore && Date.now() - cachedStoreAt < STORE_TTL) return cachedStore;
  // 본 몰 = tubeping 우선, 없으면 첫 cafe24 active 스토어
  const { data } = await supabaseAdmin
    .from("stores")
    .select("mall_id, access_token, store_url, status")
    .eq("mall_id", "tubeping")
    .maybeSingle();

  if (!data) {
    const { data: any } = await supabaseAdmin
      .from("stores")
      .select("mall_id, access_token, store_url, status")
      .not("access_token", "is", null)
      .limit(1)
      .maybeSingle();
    if (!any) return null;
    cachedStore = { mall_id: any.mall_id, access_token: any.access_token, store_url: any.store_url };
  } else {
    cachedStore = { mall_id: data.mall_id, access_token: data.access_token, store_url: data.store_url };
  }
  cachedStoreAt = Date.now();
  return cachedStore;
}

const productCache = new Map<string, { value: Cafe24Product | null; ts: number }>();
const PRODUCT_TTL = 10 * 60 * 1000; // 10분

/**
 * 상품명으로 카페24 상품 검색 → 가장 일치하는 1건 반환
 * 못 찾거나 토큰 만료 시 null 반환 (조용히 실패)
 */
export async function searchCafe24ProductByName(productName: string): Promise<Cafe24Product | null> {
  if (!productName) return null;
  const key = productName.trim();
  const cached = productCache.get(key);
  if (cached && Date.now() - cached.ts < PRODUCT_TTL) return cached.value;

  const store = await getCafe24Store();
  if (!store?.mall_id || !store?.access_token) {
    productCache.set(key, { value: null, ts: Date.now() });
    return null;
  }

  // 키워드는 너무 길면 잘라서 검색 (특수문자 포함 시 결과 적게 나옴)
  const keyword = key.slice(0, 30);
  const url = `https://${store.mall_id}.cafe24api.com/api/v2/admin/products?product_name=${encodeURIComponent(keyword)}&limit=10&fields=product_no,product_name,summary_description,simple_description,description,product_tag,detail_image,list_image,tiny_image,small_image`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${store.access_token}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": "2024-12-01",
      },
      next: { revalidate: 300 }, // 5분 cache
    });

    if (!res.ok) {
      productCache.set(key, { value: null, ts: Date.now() });
      return null;
    }

    const json = await res.json();
    const products = (json.products || []) as Cafe24Product[];
    if (!products.length) {
      productCache.set(key, { value: null, ts: Date.now() });
      return null;
    }

    // 정확 일치 우선
    const exact = products.find((p) => p.product_name === key);
    const picked = exact || products[0];
    productCache.set(key, { value: picked, ts: Date.now() });
    return picked;
  } catch {
    productCache.set(key, { value: null, ts: Date.now() });
    return null;
  }
}

/**
 * 상품 상세 페이지 URL 생성
 * 우선 store.store_url 사용, 없으면 mall_id.cafe24.com 폴백
 */
export async function getCafe24ProductUrl(productNo: number): Promise<string | null> {
  const store = await getCafe24Store();
  if (!store?.mall_id) return null;
  const base = store.store_url?.replace(/\/$/, "") || `https://${store.mall_id}.cafe24.com`;
  return `${base}/product/detail.html?product_no=${productNo}`;
}

/**
 * HTML 태그 제거 (특장점 plain text로 표시할 때)
 */
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

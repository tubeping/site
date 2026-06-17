import { supabaseAdmin } from "./supabase-server";

type Cafe24Store = {
  mall_id: string;
  access_token: string | null;
  refresh_token: string | null;
  client_id: string | null;
  client_secret: string | null;
  store_url: string | null;
  token_expires_at: string | null;
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
const STORE_TTL = 2 * 60 * 1000; // 2분 (토큰 만료 가능성 짧게)

async function getCafe24Store(): Promise<Cafe24Store | null> {
  if (cachedStore && Date.now() - cachedStoreAt < STORE_TTL) return cachedStore;
  const { data } = await supabaseAdmin
    .from("stores")
    .select(
      "mall_id, access_token, refresh_token, client_id, client_secret, store_url, token_expires_at"
    )
    .eq("mall_id", "tubeping")
    .maybeSingle();

  if (!data) return null;
  cachedStore = data as Cafe24Store;
  cachedStoreAt = Date.now();
  return cachedStore;
}

/**
 * stores 토큰은 admin과 공유되므로 site에서 직접 refresh 안 함 (race condition 방지).
 * stores 토큰이 만료면 조용히 null 반환 → 카페24 API 미사용, graceful skip.
 * (향후 site 전용 OAuth client_id가 발급되면 자체 refresh 활성화 가능)
 */
async function getValidAccessToken(): Promise<{ mallId: string; accessToken: string; storeUrl: string | null } | null> {
  const store = await getCafe24Store();
  if (!store?.mall_id || !store?.access_token) return null;

  // stores의 token_expires_at은 admin이 관리. site는 그 값을 신뢰하고 read only.
  const expiresAt = store.token_expires_at ? new Date(store.token_expires_at).getTime() : 0;
  const now = Date.now();
  // 만료됐으면 사용 안 함 (admin이 갱신할 때까지 대기)
  if (expiresAt && expiresAt < now) return null;

  return { mallId: store.mall_id, accessToken: store.access_token, storeUrl: store.store_url };
}

const productCache = new Map<string, { value: Cafe24Product | null; ts: number }>();
const PRODUCT_TTL = 10 * 60 * 1000; // 10분

/**
 * 상품명으로 카페24 상품 검색. 401이면 한 번 refresh 후 재시도.
 */
export async function searchCafe24ProductByName(productName: string): Promise<Cafe24Product | null> {
  if (!productName) return null;
  const key = productName.trim();
  const cached = productCache.get(key);
  if (cached && Date.now() - cached.ts < PRODUCT_TTL) return cached.value;

  const cred = await getValidAccessToken();
  if (!cred) {
    productCache.set(key, { value: null, ts: Date.now() });
    return null;
  }

  const keyword = key.slice(0, 30);
  const url = `https://${cred.mallId}.cafe24api.com/api/v2/admin/products?product_name=${encodeURIComponent(
    keyword
  )}&limit=10&fields=product_no,product_name,summary_description,simple_description,description,product_tag,detail_image,list_image,tiny_image,small_image`;

  async function doFetch(token: string) {
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": "2024-12-01",
      },
    });
  }

  try {
    const res = await doFetch(cred.accessToken);
    // 401이면 admin이 새 토큰으로 갱신할 때까지 대기 (site에서 refresh 안 함)
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
    const exact = products.find((p) => p.product_name === key);
    const picked = exact || products[0];
    productCache.set(key, { value: picked, ts: Date.now() });
    return picked;
  } catch {
    productCache.set(key, { value: null, ts: Date.now() });
    return null;
  }
}

export async function getCafe24ProductUrl(productNo: number): Promise<string | null> {
  const store = await getCafe24Store();
  if (!store?.mall_id) return null;
  const base = store.store_url?.replace(/\/$/, "") || `https://${store.mall_id}.cafe24.com`;
  return `${base}/product/detail.html?product_no=${productNo}`;
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

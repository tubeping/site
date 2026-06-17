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
 * refresh_token으로 새 access_token 발급 + stores 테이블에 저장
 * 카페24는 refresh 시 새 refresh_token도 발급(rolling) → 동시에 저장해야 admin도 정상 작동
 */
async function refreshAccessToken(store: Cafe24Store): Promise<string | null> {
  if (!store.refresh_token || !store.mall_id) return null;
  const clientId = store.client_id || process.env.CAFE24_CLIENT_ID?.trim();
  const clientSecret = store.client_secret || process.env.CAFE24_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  try {
    const res = await fetch(`https://${store.mall_id}.cafe24api.com/api/v2/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: store.refresh_token,
      }).toString(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const newAccess = json.access_token as string | undefined;
    const newRefresh = json.refresh_token as string | undefined;
    const expiresAt = json.expires_at as string | undefined;
    if (!newAccess) return null;

    // 즉시 stores에 저장 (admin도 동일 토큰 공유 → 충돌 방지)
    await supabaseAdmin
      .from("stores")
      .update({
        access_token: newAccess,
        refresh_token: newRefresh || store.refresh_token,
        token_expires_at: expiresAt || null,
      })
      .eq("mall_id", store.mall_id);

    // in-memory 캐시도 갱신
    cachedStore = {
      ...store,
      access_token: newAccess,
      refresh_token: newRefresh || store.refresh_token,
      token_expires_at: expiresAt || null,
    };
    cachedStoreAt = Date.now();
    return newAccess;
  } catch {
    return null;
  }
}

async function getValidAccessToken(): Promise<{ mallId: string; accessToken: string; storeUrl: string | null } | null> {
  const store = await getCafe24Store();
  if (!store?.mall_id) return null;

  // 토큰 만료 임박(5분 이내) 또는 없음이면 refresh
  let token = store.access_token;
  const expiresAt = store.token_expires_at ? new Date(store.token_expires_at).getTime() : 0;
  const now = Date.now();
  if (!token || expiresAt - now < 5 * 60 * 1000) {
    token = await refreshAccessToken(store);
  }
  if (!token) return null;
  return { mallId: store.mall_id, accessToken: token, storeUrl: store.store_url };
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
    let res = await doFetch(cred.accessToken);
    // 401이면 강제 refresh 후 재시도
    if (res.status === 401) {
      cachedStoreAt = 0; // store cache 무효화
      const fresh = await getValidAccessToken();
      if (fresh) {
        res = await doFetch(fresh.accessToken);
      }
    }
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

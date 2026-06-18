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

/**
 * 카페24 페이지의 og 메타 태그를 가져옴 (공개 메타 정보만)
 * - og:image (큰 사이즈 이미지)
 * - og:url (정식 SEO URL)
 * - og:title
 */
type Cafe24Meta = {
  ogUrl: string | null;
  ogImage: string | null;
  ogTitle: string | null;
};

const metaCache = new Map<string, { value: Cafe24Meta | null; ts: number }>();
const META_TTL = 30 * 60 * 1000; // 30분

export async function getCafe24PageMeta(cafe24ProductNo: number): Promise<Cafe24Meta | null> {
  const key = String(cafe24ProductNo);
  const cached = metaCache.get(key);
  if (cached && Date.now() - cached.ts < META_TTL) return cached.value;

  try {
    const res = await fetch(
      `https://${TUBEPING_MALL_ID}.cafe24.com/product/detail.html?product_no=${cafe24ProductNo}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (TubePing-Site-Proposal-Renderer)" },
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) {
      metaCache.set(key, { value: null, ts: Date.now() });
      return null;
    }
    const html = await res.text();

    const pick = (prop: string) => {
      const re = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
      const m = html.match(re);
      return m?.[1] || null;
    };

    const meta: Cafe24Meta = {
      ogUrl: pick("og:url"),
      ogImage: pick("og:image"),
      ogTitle: pick("og:title"),
    };
    metaCache.set(key, { value: meta, ts: Date.now() });
    return meta;
  } catch {
    metaCache.set(key, { value: null, ts: Date.now() });
    return null;
  }
}

/**
 * 카페24 상품 상세 본문(HTML) 추출.
 * <div id="prdDetail"> ~ <div id="review"> 사이의 HTML을 잘라서 반환.
 * - script/iframe/style/link/meta 제거
 * - on* 이벤트 핸들러 제거
 * - 상대 src/href를 절대 URL로 변환
 * 같은 회사 자산(tubeping.com)이라 ToS 위반 없음.
 */
type Cafe24Detail = {
  html: string | null;
  meta: Cafe24Meta | null;
};

const detailCache = new Map<string, { value: Cafe24Detail; ts: number }>();
const DETAIL_TTL = 30 * 60 * 1000; // 30분

function sanitizeAndAbsolutize(html: string): string {
  const base = `https://${TUBEPING_MALL_ID}.cafe24.com`;
  let s = html
    // 위험 태그 통째로 제거
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    // 이벤트 핸들러 제거 (onclick, onload 등)
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // 카페24 lazy load 속성 → 표준 src로 변환 (서버사이드 렌더링용)
    .replace(/\sec-data-src=/gi, " src=")
    .replace(/\sdata-original=/gi, " src=")
    .replace(/\sdata-lazy-src=/gi, " src=")
    .replace(/\sdata-src=/gi, " src=")
    // 빈 div(width=0 등) 광고 트래커 의심 제거
    .replace(/<img[^>]*width=["']?[01]["']?[^>]*>/gi, "")
    // src/href 상대경로 → 절대경로 (// 시작은 https: prefix)
    .replace(/(\s(?:src|href)=["'])\/\/([^"']+)/gi, `$1https://$2`)
    .replace(/(\s(?:src|href)=["'])\/(?!\/)([^"']+)/gi, `$1${base}/$2`);

  // 한 태그에 src가 중복으로 생긴 경우(원래 src placeholder + 변환된 src) → 마지막 src만 남김
  s = s.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
    const srcs = [...attrs.matchAll(/\ssrc=("[^"]*"|'[^']*')/gi)];
    if (srcs.length <= 1) return full;
    // 마지막 src를 채택 (lazy 변환된 실제 URL이 보통 뒤에 옴)
    const last = srcs[srcs.length - 1][1];
    const cleaned = attrs.replace(/\ssrc=("[^"]*"|'[^']*')/gi, "");
    return `<img${cleaned} src=${last}>`;
  });

  return s;
}

export async function getCafe24ProductDetail(
  cafe24ProductNo: number
): Promise<Cafe24Detail> {
  const key = String(cafe24ProductNo);
  const cached = detailCache.get(key);
  if (cached && Date.now() - cached.ts < DETAIL_TTL) return cached.value;

  const empty: Cafe24Detail = { html: null, meta: null };

  try {
    const res = await fetch(
      `https://${TUBEPING_MALL_ID}.cafe24.com/product/detail.html?product_no=${cafe24ProductNo}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TubePing-Proposal/1.0)" },
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) {
      detailCache.set(key, { value: empty, ts: Date.now() });
      return empty;
    }
    const fullHtml = await res.text();

    // og 메타 추출
    const pickMeta = (prop: string) => {
      const re = new RegExp(
        `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        "i"
      );
      const m = fullHtml.match(re);
      return m?.[1] || null;
    };
    const meta: Cafe24Meta = {
      ogUrl: pickMeta("og:url"),
      ogImage: pickMeta("og:image"),
      ogTitle: pickMeta("og:title"),
    };

    // 본문 영역 추출: <div id="prdDetail"> ~ <div id="review">
    const startMatch = fullHtml.match(/<div[^>]*id=["']prdDetail["'][^>]*>/i);
    if (!startMatch || startMatch.index === undefined) {
      const value = { html: null, meta };
      detailCache.set(key, { value, ts: Date.now() });
      return value;
    }
    const startIdx = startMatch.index + startMatch[0].length;
    const remaining = fullHtml.slice(startIdx);
    // 다음 형제 영역 시작점(review/qna/related 등) 찾기
    const endMatch = remaining.match(
      /<div[^>]*id=["'](?:review|qna|prdReview|relatedProduct|relation|recommend)["'][^>]*>/i
    );
    const endIdx = endMatch?.index ?? remaining.length;
    let body = remaining.slice(0, endIdx);

    // 마지막 닫는 </div> 1개는 prdDetail의 짝이므로 제거 (균형 맞추기)
    body = body.replace(/<\/div>\s*$/, "");

    body = sanitizeAndAbsolutize(body);

    // 너무 크면 자름 (300KB)
    if (body.length > 300000) body = body.slice(0, 300000);

    const value: Cafe24Detail = { html: body, meta };
    detailCache.set(key, { value, ts: Date.now() });
    return value;
  } catch {
    detailCache.set(key, { value: empty, ts: Date.now() });
    return empty;
  }
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

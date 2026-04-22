import { NextRequest, NextResponse } from "next/server";

// 커스텀 도메인 → slug 매핑 캐시 (5분 TTL)
const domainCache = new Map<string, { slug: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getSlugByDomain(hostname: string): Promise<string | null> {
  const cached = domainCache.get(hostname);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.slug;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return null;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/creator_shops?custom_domain=eq.${encodeURIComponent(hostname)}&select=creator_id,creators(shop_slug)`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const slug = data?.[0]?.creators?.shop_slug;
    if (slug) domainCache.set(hostname, { slug, ts: Date.now() });
    return slug || null;
  } catch {
    return null;
  }
}

// TubePing 기본 도메인 목록
const DEFAULT_DOMAINS = ["localhost", "tubeping.com", "tubeping.shop", "tubeping.site", "tpng.kr", "vercel.app"];

// ── tubeping.site 홈페이지 전용 도메인 보호 ──
// 빌더 코드가 같은 repo에 있는 현재 구조에서, tubeping.site 도메인으로 들어온
// 요청은 홈페이지 관련 경로만 허용하고 나머지는 `/`로 리다이렉트
const HOMEPAGE_ONLY_HOSTS = ["tubeping.site", "www.tubeping.site"];
const HOMEPAGE_ALLOWED_PATHS = new Set([
  "/", "/blog", "/privacy", "/terms", "/ads-disclosure",
  "/sitemap.xml", "/robots.txt", "/feed.xml", "/llms.txt",
  "/favicon.ico", "/favicon.png", "/og-image.png",
]);
const HOMEPAGE_ALLOWED_PREFIXES = ["/blog/", "/api/blog", "/api/apply", "/_next/", "/api/cron/"];

function isHomepageOnlyHost(hostname: string) {
  return HOMEPAGE_ONLY_HOSTS.some((h) => hostname === h);
}
function isHomepagePath(pathname: string) {
  if (HOMEPAGE_ALLOWED_PATHS.has(pathname)) return true;
  return HOMEPAGE_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // ── tubeping.site 도메인 방어: 빌더 경로 접근 차단 ──
  if (isHomepageOnlyHost(hostname) && !isHomepagePath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url, 302);
  }

  // ── 커스텀 도메인 감지 ──
  const isDefaultDomain = DEFAULT_DOMAINS.some((d) => hostname.includes(d));
  if (!isDefaultDomain && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    const slug = await getSlugByDomain(hostname);
    if (slug) {
      if (pathname === "/" || pathname === "") {
        return NextResponse.rewrite(new URL(`/shop/${slug}`, request.url));
      }
      return NextResponse.rewrite(new URL(`/shop/${slug}${pathname}`, request.url));
    }
  }

  // ── 인증 체크 (기본 도메인) ──
  // TODO: Supabase Auth 연동 완료 후 인증 체크 복원
  const protectedPaths: string[] = []; // 임시: 인증 없이 대시보드 접근 허용
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Supabase 세션 확인 — Edge 호환 (REST API 직접 호출, @supabase/ssr 제거)
  const accessToken = request.cookies.getAll()
    .find(c => c.name.includes("auth-token") || c.name === "sb-access-token")?.value;

  if (!accessToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return NextResponse.next();

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

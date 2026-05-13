import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// admin 대시보드용: 최근 발행 글 + 카테고리별 통계
export async function GET(request: Request) {
  // 인증
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.ADMIN_API_KEY || process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 최근 30일 발행 글
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: recent } = await supabaseAdmin
    .from("blog_posts")
    .select("id, title, slug, category, keywords, published_at, excerpt")
    .eq("published", true)
    .gte("published_at", since.toISOString())
    .order("published_at", { ascending: false });

  // 카테고리별 카운트
  const { data: all } = await supabaseAdmin
    .from("blog_posts")
    .select("category, published_at")
    .eq("published", true);

  const totalPublished = all?.length || 0;
  const byCategory: Record<string, number> = {};
  (all || []).forEach((p) => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  });

  // 최근 7일/30일 발행 수
  const now = Date.now();
  const last7 = (all || []).filter((p) => now - new Date(p.published_at).getTime() < 7 * 86400000).length;
  const last30 = (all || []).filter((p) => now - new Date(p.published_at).getTime() < 30 * 86400000).length;

  return NextResponse.json({
    totalPublished,
    last7Days: last7,
    last30Days: last30,
    byCategory,
    recentPosts: (recent || []).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category,
      excerpt: p.excerpt,
      keywords: p.keywords,
      published_at: p.published_at,
      url: `https://tubeping.site/blog/${p.slug}`,
    })),
  });
}

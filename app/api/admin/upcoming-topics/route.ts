import { NextResponse } from "next/server";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase-server";
import { TOPIC_POOL } from "../../cron/auto-blog/topic-pool";

export const dynamic = "force-dynamic";

const SITE_URL = "https://tubeping.site/";

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

// admin 대시보드용: 다음 자동 발행 후보 주제 + GSC 거의 1페이지 키워드
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.ADMIN_API_KEY || process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 기존 글의 키워드/제목 수집 (중복 방지)
  const { data: existing } = await supabaseAdmin
    .from("blog_posts")
    .select("title, keywords")
    .eq("published", true);

  const existingTitles = new Set((existing || []).map((p) => p.title.toLowerCase()));
  const existingKws = new Set(
    (existing || []).flatMap((p) => (p.keywords || []) as string[]).map((k) => k.toLowerCase())
  );

  // 토픽 풀 후보 (중복 제외)
  const poolCandidates = TOPIC_POOL.filter((t) => {
    if (existingTitles.has(t.title.toLowerCase())) return false;
    const kwHit = t.targetKeywords.some((k) => existingKws.has(k.toLowerCase()));
    return !kwHit;
  });

  // GSC 거의 1페이지 키워드
  const gscCandidates: GscRow[] = [];
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    try {
      const authJwt = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
      });
      const webmasters = google.webmasters({ version: "v3", auth: authJwt });
      const now = new Date();
      const end = new Date(now); end.setDate(end.getDate() - 3);
      const start = new Date(end); start.setDate(start.getDate() - 28);
      const res = await webmasters.searchanalytics.query({
        siteUrl: SITE_URL,
        requestBody: {
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          dimensions: ["query"],
          rowLimit: 50,
        },
      });
      const rows = (res.data.rows || []) as GscRow[];
      for (const r of rows) {
        if (r.position >= 4 && r.position <= 15 && r.impressions >= 20) {
          const q = r.keys[0]?.toLowerCase() || "";
          // 기존 글과 중복 안 되는 것만
          if (![...existingKws].some((k) => k === q || (q.includes(k) && k.length > 5))) {
            gscCandidates.push(r);
          }
        }
      }
    } catch (e) {
      console.error("GSC fetch failed:", e);
    }
  }

  return NextResponse.json({
    poolRemaining: poolCandidates.length,
    poolTotal: TOPIC_POOL.length,
    upcoming: {
      // 다음 5개 토픽 풀 후보
      fromPool: poolCandidates.slice(0, 10).map((t) => ({
        title: t.title,
        category: t.category,
        angle: t.angle,
        targetKeywords: t.targetKeywords,
      })),
      // GSC 거의 1페이지 키워드 (상위 10개)
      fromGsc: gscCandidates.slice(0, 10).map((r) => ({
        query: r.keys[0],
        position: r.position,
        impressions: r.impressions,
        ctr: r.ctr,
      })),
    },
    gscEnabled: !!(clientEmail && privateKey),
  });
}

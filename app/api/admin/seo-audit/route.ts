import { NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

const SITE_URL = "https://tubeping.site/";

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchGSC(dimensions: string[], startDate: string, endDate: string, rowLimit = 25): Promise<GscRow[]> {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return [];
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const webmasters = google.webmasters({ version: "v3", auth });
  const res = await webmasters.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate, endDate, dimensions, rowLimit },
  });
  return (res.data.rows || []) as GscRow[];
}

// admin 대시보드용: 실시간 사이트 진단 (GSC API 직접 호출)
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.ADMIN_API_KEY || process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GSC_CLIENT_EMAIL || !process.env.GSC_PRIVATE_KEY) {
    return NextResponse.json({
      enabled: false,
      message: "GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY 환경변수가 설정되지 않았습니다. Google Search Console Service Account 설정이 필요합니다.",
    });
  }

  try {
    const now = new Date();
    const end = new Date(now); end.setDate(end.getDate() - 3);
    const start = new Date(end); start.setDate(start.getDate() - 7);
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 7);

    const [curRows, prevRows, topQueries, topPages, allPages, allQueries] = await Promise.all([
      fetchGSC([], ymd(start), ymd(end), 1),
      fetchGSC([], ymd(prevStart), ymd(prevEnd), 1),
      fetchGSC(["query"], ymd(start), ymd(end), 25),
      fetchGSC(["page"], ymd(start), ymd(end), 25),
      fetchGSC(["page"], ymd(start), ymd(end), 50),
      fetchGSC(["query"], ymd(start), ymd(end), 100),
    ]);

    const current = curRows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0, keys: [] };
    const previous = prevRows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0, keys: [] };

    // CTR 낮고 노출 많은 페이지 (제목/설명 개선 필요)
    const lowCtrPages = allPages
      .filter((r) => r.impressions >= 50 && r.ctr < 0.03)
      .sort((a, b) => b.impressions - a.impressions);

    // 거의 1페이지 키워드
    const nearPageOne = allQueries
      .filter((r) => r.position >= 4 && r.position <= 10 && r.impressions >= 10)
      .sort((a, b) => b.impressions - a.impressions);

    return NextResponse.json({
      enabled: true,
      period: { start: ymd(start), end: ymd(end) },
      previousPeriod: { start: ymd(prevStart), end: ymd(prevEnd) },
      summary: {
        current: {
          clicks: current.clicks,
          impressions: current.impressions,
          ctr: current.ctr,
          position: current.position,
        },
        previous: {
          clicks: previous.clicks,
          impressions: previous.impressions,
          ctr: previous.ctr,
          position: previous.position,
        },
        change: {
          clicks: previous.clicks > 0 ? ((current.clicks - previous.clicks) / previous.clicks) * 100 : null,
          impressions: previous.impressions > 0 ? ((current.impressions - previous.impressions) / previous.impressions) * 100 : null,
          positionDelta: previous.position - current.position, // 양수 = 순위 상승
        },
      },
      topQueries: topQueries.slice(0, 15).map((r) => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      })),
      topPages: topPages.slice(0, 15).map((r) => ({
        page: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
      })),
      improvementTargets: {
        lowCtrPages: lowCtrPages.slice(0, 10).map((r) => ({
          page: r.keys[0],
          impressions: r.impressions,
          ctr: r.ctr,
          reason: "노출은 많지만 클릭률 낮음 — 제목/메타설명 개선 필요",
        })),
        nearPageOne: nearPageOne.slice(0, 10).map((r) => ({
          query: r.keys[0],
          position: r.position,
          impressions: r.impressions,
          reason: "4~10위 — 1페이지 진입 잠재력 높음",
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        enabled: true,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

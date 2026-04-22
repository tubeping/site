import { NextResponse } from "next/server";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE_URL = "https://tubeping.site/";
const REPORT_EMAIL = process.env.REPORT_EMAIL || "master@shinsananalytics.com";

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchGSC(dimensions: string[], startDate: string, endDate: string): Promise<Row[]> {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("GSC credentials missing");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  const webmasters = google.webmasters({ version: "v3", auth });
  const res = await webmasters.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit: 25,
    },
  });

  return (res.data.rows || []) as Row[];
}

function diff(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? "🆕" : "—";
  const pct = ((curr - prev) / prev) * 100;
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "—";
  return `${arrow} ${Math.abs(pct).toFixed(0)}%`;
}

function num(n: number): string {
  return n.toLocaleString("ko");
}

async function analyzeWithClaude(data: {
  current: { clicks: number; impressions: number; ctr: number; position: number };
  previous: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: Row[];
  topPages: Row[];
  lowCtrPages: Row[];
  nearPageOne: Row[];
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";

  const client = new Anthropic({ apiKey });

  const prompt = `다음은 tubeping.site (유튜브 크리에이터 커머스 풀필먼트 서비스, 블로그 운영)의 Google Search Console 주간 데이터입니다.

## 이번 주 vs 지난 주
- 클릭: ${data.current.clicks} (지난주 ${data.previous.clicks})
- 노출: ${data.current.impressions} (지난주 ${data.previous.impressions})
- CTR: ${(data.current.ctr * 100).toFixed(2)}% (지난주 ${(data.previous.ctr * 100).toFixed(2)}%)
- 평균 순위: ${data.current.position.toFixed(1)} (지난주 ${data.previous.position.toFixed(1)})

## 상위 검색어 (클릭 기준)
${data.topQueries.slice(0, 10).map((r, i) => `${i + 1}. "${r.keys[0]}" — ${r.clicks}클릭, 순위 ${r.position.toFixed(1)}`).join("\n")}

## 상위 페이지
${data.topPages.slice(0, 10).map((r, i) => `${i + 1}. ${r.keys[0].replace("https://tubeping.site", "")} — ${r.clicks}클릭`).join("\n")}

## 노출은 많은데 클릭률 낮은 페이지 (제목/설명 개선 필요)
${data.lowCtrPages.slice(0, 5).map((r, i) => `${i + 1}. ${r.keys[0].replace("https://tubeping.site", "")} — ${r.impressions}노출, CTR ${(r.ctr * 100).toFixed(1)}%`).join("\n")}

## 거의 1페이지 (순위 4~10위, 조금만 밀면 1페이지)
${data.nearPageOne.slice(0, 5).map((r, i) => `${i + 1}. "${r.keys[0]}" — 순위 ${r.position.toFixed(1)}, ${r.impressions}노출`).join("\n")}

위 데이터를 바탕으로 **3가지**를 한국어로 답변:

1. **이번 주 핵심 인사이트** (2~3줄)
2. **다음 주 액션 아이템 3가지** (우선순위 순, 구체적으로)
3. **다음 블로그 글 주제 3가지 제안** (어떤 키워드를 노릴지, 제목 예시 포함)

간결하고 실행 가능하게 작성해주세요.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return text;
}

function buildHtml(opts: {
  weekStart: string;
  weekEnd: string;
  current: { clicks: number; impressions: number; ctr: number; position: number };
  previous: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: Row[];
  topPages: Row[];
  lowCtrPages: Row[];
  nearPageOne: Row[];
  aiAnalysis: string;
}): string {
  const { weekStart, weekEnd, current, previous, topQueries, topPages, lowCtrPages, nearPageOne, aiAnalysis } = opts;

  const aiHtml = aiAnalysis
    ? `<div style="background:#FFF8F8;border-left:4px solid #C41E1E;padding:20px;margin:24px 0;border-radius:8px">
         <h2 style="margin:0 0 12px;color:#C41E1E">🤖 AI 분석 및 제안</h2>
         <div style="white-space:pre-wrap;color:#333;line-height:1.7;font-size:14px">${aiAnalysis.replace(/</g, "&lt;")}</div>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#111">
  <h1 style="color:#C41E1E">📊 tubeping.site 주간 SEO 리포트</h1>
  <p style="color:#666">${weekStart} ~ ${weekEnd}</p>

  <h2 style="border-bottom:2px solid #C41E1E;padding-bottom:8px">이번 주 요약</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead>
      <tr style="background:#F9FAFB">
        <th style="padding:12px;text-align:left;border:1px solid #E5E7EB">지표</th>
        <th style="padding:12px;text-align:right;border:1px solid #E5E7EB">이번 주</th>
        <th style="padding:12px;text-align:right;border:1px solid #E5E7EB">지난 주</th>
        <th style="padding:12px;text-align:center;border:1px solid #E5E7EB">변화</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:12px;border:1px solid #E5E7EB">클릭</td><td style="padding:12px;text-align:right;border:1px solid #E5E7EB">${num(current.clicks)}</td><td style="padding:12px;text-align:right;border:1px solid #E5E7EB">${num(previous.clicks)}</td><td style="padding:12px;text-align:center;border:1px solid #E5E7EB">${diff(current.clicks, previous.clicks)}</td></tr>
      <tr><td style="padding:12px;border:1px solid #E5E7EB">노출</td><td style="padding:12px;text-align:right;border:1px solid #E5E7EB">${num(current.impressions)}</td><td style="padding:12px;text-align:right;border:1px solid #E5E7EB">${num(previous.impressions)}</td><td style="padding:12px;text-align:center;border:1px solid #E5E7EB">${diff(current.impressions, previous.impressions)}</td></tr>
      <tr><td style="padding:12px;border:1px solid #E5E7EB">CTR</td><td style="padding:12px;text-align:right;border:1px solid #E5E7EB">${(current.ctr * 100).toFixed(2)}%</td><td style="padding:12px;text-align:right;border:1px solid #E5E7EB">${(previous.ctr * 100).toFixed(2)}%</td><td style="padding:12px;text-align:center;border:1px solid #E5E7EB">${diff(current.ctr, previous.ctr)}</td></tr>
      <tr><td style="padding:12px;border:1px solid #E5E7EB">평균 순위</td><td style="padding:12px;text-align:right;border:1px solid #E5E7EB">${current.position.toFixed(1)}</td><td style="padding:12px;text-align:right;border:1px solid #E5E7EB">${previous.position.toFixed(1)}</td><td style="padding:12px;text-align:center;border:1px solid #E5E7EB">${current.position < previous.position ? "▲ 상승" : current.position > previous.position ? "▼ 하락" : "—"}</td></tr>
    </tbody>
  </table>

  ${aiHtml}

  <h2 style="border-bottom:2px solid #C41E1E;padding-bottom:8px;margin-top:32px">상위 검색어 TOP 10</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <thead><tr style="background:#F9FAFB"><th style="padding:10px;text-align:left;border:1px solid #E5E7EB">검색어</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">클릭</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">노출</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">순위</th></tr></thead>
    <tbody>
      ${topQueries.slice(0, 10).map((r) => `<tr><td style="padding:10px;border:1px solid #E5E7EB">${r.keys[0]}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${r.clicks}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${r.impressions}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${r.position.toFixed(1)}</td></tr>`).join("")}
    </tbody>
  </table>

  <h2 style="border-bottom:2px solid #C41E1E;padding-bottom:8px;margin-top:32px">상위 페이지 TOP 10</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <thead><tr style="background:#F9FAFB"><th style="padding:10px;text-align:left;border:1px solid #E5E7EB">페이지</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">클릭</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">노출</th></tr></thead>
    <tbody>
      ${topPages.slice(0, 10).map((r) => `<tr><td style="padding:10px;border:1px solid #E5E7EB;word-break:break-all">${r.keys[0].replace("https://tubeping.site", "")}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${r.clicks}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${r.impressions}</td></tr>`).join("")}
    </tbody>
  </table>

  <h2 style="border-bottom:2px solid #C41E1E;padding-bottom:8px;margin-top:32px">⚠️ 제목/설명 개선 필요 (CTR 낮음)</h2>
  <p style="color:#666;font-size:13px">노출은 많은데 클릭률이 낮은 페이지. 제목/메타 설명 개선 우선순위.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <thead><tr style="background:#F9FAFB"><th style="padding:10px;text-align:left;border:1px solid #E5E7EB">페이지</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">노출</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">CTR</th></tr></thead>
    <tbody>
      ${lowCtrPages.slice(0, 5).map((r) => `<tr><td style="padding:10px;border:1px solid #E5E7EB;word-break:break-all">${r.keys[0].replace("https://tubeping.site", "")}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${r.impressions}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${(r.ctr * 100).toFixed(1)}%</td></tr>`).join("")}
    </tbody>
  </table>

  <h2 style="border-bottom:2px solid #C41E1E;padding-bottom:8px;margin-top:32px">🎯 거의 1페이지 (순위 4~10)</h2>
  <p style="color:#666;font-size:13px">조금만 밀면 1페이지 진입 가능한 키워드.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <thead><tr style="background:#F9FAFB"><th style="padding:10px;text-align:left;border:1px solid #E5E7EB">검색어</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">현재 순위</th><th style="padding:10px;text-align:right;border:1px solid #E5E7EB">노출</th></tr></thead>
    <tbody>
      ${nearPageOne.slice(0, 5).map((r) => `<tr><td style="padding:10px;border:1px solid #E5E7EB">${r.keys[0]}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${r.position.toFixed(1)}</td><td style="padding:10px;text-align:right;border:1px solid #E5E7EB">${r.impressions}</td></tr>`).join("")}
    </tbody>
  </table>

  <div style="text-align:center;margin-top:40px;padding:20px;background:#F9FAFB;border-radius:8px">
    <a href="https://search.google.com/search-console" style="color:#C41E1E;text-decoration:none;font-weight:bold">Google Search Console에서 자세히 보기 →</a>
  </div>

  <p style="color:#999;font-size:12px;text-align:center;margin-top:32px">
    이 리포트는 매주 월요일 자동 발송됩니다.<br/>
    tubeping.site · ㈜신산애널리틱스
  </p>
</body></html>`;
}

export async function GET(request: Request) {
  // Vercel Cron은 자체 서명으로 호출. 외부 호출 방지.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // GSC 데이터는 2~3일 지연됨 → 3일 전까지만 조회
    const end = new Date(now); end.setDate(end.getDate() - 3);
    const start = new Date(end); start.setDate(start.getDate() - 7);
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 7);

    const [curRows, prevRows, topQueries, topPages, allPages, allQueries] = await Promise.all([
      fetchGSC([], ymd(start), ymd(end)),
      fetchGSC([], ymd(prevStart), ymd(prevEnd)),
      fetchGSC(["query"], ymd(start), ymd(end)),
      fetchGSC(["page"], ymd(start), ymd(end)),
      fetchGSC(["page"], ymd(start), ymd(end)),
      fetchGSC(["query"], ymd(start), ymd(end)),
    ]);

    const current = curRows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0, keys: [] };
    const previous = prevRows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0, keys: [] };

    // CTR 낮고 노출 많은 페이지
    const lowCtrPages = allPages
      .filter((r) => r.impressions >= 50 && r.ctr < 0.03)
      .sort((a, b) => b.impressions - a.impressions);

    // 거의 1페이지 키워드
    const nearPageOne = allQueries
      .filter((r) => r.position >= 4 && r.position <= 10 && r.impressions >= 10)
      .sort((a, b) => b.impressions - a.impressions);

    const reportData = {
      current: { clicks: current.clicks, impressions: current.impressions, ctr: current.ctr, position: current.position },
      previous: { clicks: previous.clicks, impressions: previous.impressions, ctr: previous.ctr, position: previous.position },
      topQueries,
      topPages,
      lowCtrPages,
      nearPageOne,
    };

    let aiAnalysis = "";
    try {
      aiAnalysis = await analyzeWithClaude(reportData);
    } catch (e) {
      console.error("Claude analysis failed:", e);
    }

    const html = buildHtml({
      weekStart: ymd(start),
      weekEnd: ymd(end),
      ...reportData,
      aiAnalysis,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"TubePing SEO 리포트" <${process.env.SMTP_USER}>`,
      to: REPORT_EMAIL,
      subject: `📊 tubeping.site 주간 SEO 리포트 (${ymd(start)} ~ ${ymd(end)})`,
      html,
    });

    return NextResponse.json({
      ok: true,
      period: `${ymd(start)} ~ ${ymd(end)}`,
      clicks: current.clicks,
      impressions: current.impressions,
      email: REPORT_EMAIL,
    });
  } catch (error) {
    console.error("GSC report error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

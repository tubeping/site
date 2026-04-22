import { NextResponse } from "next/server";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-server";
import { TOPIC_POOL, TopicSeed } from "./topic-pool";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Claude 생성에 시간 걸림

const SITE_URL = "https://tubeping.site/";
const REPORT_EMAIL = process.env.REPORT_EMAIL || "master@shinsananalytics.com";

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

function slugify(text: string): string {
  // 한글이 포함된 제목을 영문 slug로 생성 — Claude가 생성한 slug 우선 사용
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function fetchGscNearPageOne(): Promise<GscRow[]> {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return [];

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const webmasters = google.webmasters({ version: "v3", auth });

    const now = new Date();
    const end = new Date(now); end.setDate(end.getDate() - 3);
    const start = new Date(end); start.setDate(start.getDate() - 28); // 4주 데이터

    const res = await webmasters.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ["query"],
        rowLimit: 100,
      },
    });
    return ((res.data.rows || []) as GscRow[])
      .filter((r) => r.position >= 4 && r.position <= 15 && r.impressions >= 20)
      .sort((a, b) => b.impressions - a.impressions);
  } catch (e) {
    console.error("GSC fetch failed:", e);
    return [];
  }
}

async function pickTopic(): Promise<{
  source: "gsc" | "pool";
  seed: TopicSeed | { query: string; impressions: number; position: number };
}> {
  // 1. 기존 블로그 글 키워드·제목 수집 (중복 방지)
  const { data: existing } = await supabaseAdmin
    .from("blog_posts")
    .select("title, slug, keywords")
    .eq("published", true);

  const existingTitles = new Set((existing || []).map((p) => p.title.toLowerCase()));
  const existingSlugs = new Set((existing || []).map((p) => p.slug));
  const existingKws = new Set(
    (existing || []).flatMap((p) => (p.keywords || []) as string[]).map((k) => k.toLowerCase())
  );

  // 2. GSC 거의 1페이지 키워드 시도
  const gscRows = await fetchGscNearPageOne();
  for (const row of gscRows) {
    const q = row.keys[0]?.toLowerCase() || "";
    // 기존 글에 이미 있는 정확한 키워드는 skip
    if ([...existingKws].some((k) => k === q || (q.includes(k) && k.length > 5))) continue;
    return {
      source: "gsc",
      seed: { query: row.keys[0], impressions: row.impressions, position: row.position },
    };
  }

  // 3. Pool에서 선택 — 기존 글과 제목·키워드 중복 안 되는 것 중 랜덤
  const candidates = TOPIC_POOL.filter((t) => {
    if (existingTitles.has(t.title.toLowerCase())) return false;
    const kwHit = t.targetKeywords.some((k) => existingKws.has(k.toLowerCase()));
    if (kwHit) return false;
    return true;
  });
  if (candidates.length === 0) {
    // 모든 풀이 소진된 경우: 랜덤으로 하나 (약한 중복 허용)
    return { source: "pool", seed: TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)] };
  }
  return { source: "pool", seed: candidates[Math.floor(Math.random() * candidates.length)] };
}

type GeneratedPost = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  keywords: string[];
  content: string;
};

async function generatePost(
  source: "gsc" | "pool",
  seed: TopicSeed | { query: string; impressions: number; position: number }
): Promise<GeneratedPost> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  let topicInstruction = "";
  if (source === "gsc" && "query" in seed) {
    topicInstruction = `타겟 검색어: "${seed.query}"
이 검색어는 현재 tubeping.site에서 ${seed.impressions}회 노출되며 평균 ${seed.position.toFixed(1)}위입니다.
1페이지(1~3위) 진입을 위해 이 검색어를 정면으로 다루는 전문적인 글을 작성해주세요.`;
  } else if ("title" in seed) {
    topicInstruction = `주제 시드: "${seed.title}"
카테고리: ${seed.category}
글의 각도: ${seed.angle}
타겟 키워드: ${seed.targetKeywords.join(", ")}
이 주제로 AEO·GEO 최적화된 글을 작성해주세요.`;
  }

  const systemPrompt = `당신은 tubeping.site(유튜브 크리에이터 커머스 풀필먼트 서비스)의 전문 블로그 에디터입니다.

# 작성 규칙

## 형식 (엄수)
- 첫 줄: "# 제목"
- 두 번째 섹션: "## 핵심 요약" — 3~4줄 직접 답변 (featured snippet용)
- 이후: "## Q1. 질문" "## Q2. 질문" ... 형식으로 8~15개 Q&A (AEO용 — FAQPage schema가 자동 추출됨)
- 각 Q&A 답변은 40~150단어, 구체적 숫자·비교·표 포함
- 필요 시 표(마크다운 |)와 리스트(-) 활용
- 마지막 섹션: "## 결론" 2~3줄 + 자연스러운 CTA
- 맨 하단: "👉👉 튜핑 입점 신청: https://tubeping.site/#contact"
- 마지막 줄: "태그: 키워드1, 키워드2, ..."

## 톤앤매너
- 한국 크리에이터 대상 실전 톤 (존댓말)
- 과장 금지, 구체적 수치·사례 우선
- TubePing(튜핑) 자연스러운 언급 (글 중후반에 1~2번)

## GEO 최적화
- 인용 가능한 통계·팩트 포함 (예: "국내 시장 약 5조 원", "전환율 3~10%")
- 연도 명시 (2026 기준)
- 출처/근거 암시 (업계 추정, 공식 데이터 등)

## 분량
- 최소 2,500자, 최대 4,500자
- 표 최소 1개, Q&A 최소 8개

# 출력 형식 (JSON)

반드시 아래 JSON만 출력하세요 (코드블록 금지, 설명 금지):

{
  "title": "제목 (50자 이내)",
  "slug": "english-url-slug-kebab-case",
  "excerpt": "150자 이내 요약. 구체적 수치 포함.",
  "category": "가이드|전략|트렌드|서비스소개|회사소개 중 하나",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "content": "# 제목\\n\\n## 핵심 요약\\n...\\n\\n## Q1. 질문\\n답변...\\n\\n(전체 마크다운)"
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: topicInstruction }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  // JSON 추출
  let jsonStr = text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  let parsed: GeneratedPost;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("Claude JSON parse failed: " + text.slice(0, 200));
  }

  // slug fallback
  if (!parsed.slug || parsed.slug.length < 3) {
    parsed.slug = slugify(parsed.title) || `auto-${Date.now()}`;
  }
  return parsed;
}

async function validatePost(post: GeneratedPost): Promise<string | null> {
  if (!post.title || post.title.length < 10 || post.title.length > 80) return "title length";
  if (!post.slug || !/^[a-z0-9-]+$/.test(post.slug)) return "slug format";
  if (!post.excerpt || post.excerpt.length < 50 || post.excerpt.length > 300) return "excerpt length";
  if (!["가이드", "전략", "트렌드", "서비스소개", "회사소개"].includes(post.category)) return "category";
  if (!Array.isArray(post.keywords) || post.keywords.length < 3) return "keywords";
  if (!post.content || post.content.length < 2000) return "content length";
  // Q&A 최소 5개
  const qCount = (post.content.match(/^##\s+Q\d*\./gm) || []).length;
  if (qCount < 5) return "Q&A count < 5";

  // slug 중복 확인
  const { data: dup } = await supabaseAdmin
    .from("blog_posts")
    .select("id")
    .eq("slug", post.slug)
    .maybeSingle();
  if (dup) return "slug duplicate";

  return null;
}

async function sendEmail(subject: string, html: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"TubePing 자동발행" <${process.env.SMTP_USER}>`,
    to: REPORT_EMAIL,
    subject,
    html,
  });
}

export async function GET(request: Request) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    await sendEmail(
      "⚠️ TubePing 자동 블로그 발행 — API 키 미설정",
      `<p>Vercel 환경변수에 <code>ANTHROPIC_API_KEY</code>를 추가하면 매주 자동 블로그 발행이 시작됩니다.</p>
       <p>Vercel Dashboard → Settings → Environment Variables에서 추가하세요.</p>`
    );
    return NextResponse.json({ skipped: "ANTHROPIC_API_KEY not set" }, { status: 200 });
  }

  try {
    // 1. 주제 선정
    const { source, seed } = await pickTopic();

    // 2. 최대 3회 생성 시도 (검증 실패 시 재시도)
    let post: GeneratedPost | null = null;
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const generated = await generatePost(source, seed);
        const validationError = await validatePost(generated);
        if (!validationError) {
          post = generated;
          break;
        }
        lastError = validationError;
      } catch (e) {
        lastError = String(e);
      }
    }

    if (!post) {
      await sendEmail(
        "⚠️ TubePing 자동 블로그 — 생성 실패",
        `<p>3회 시도 모두 실패. 마지막 에러: <code>${lastError}</code></p>
         <p>주제 시드: <code>${JSON.stringify(seed)}</code></p>`
      );
      return NextResponse.json({ error: lastError }, { status: 500 });
    }

    // 3. Supabase INSERT
    const { data: inserted, error } = await supabaseAdmin
      .from("blog_posts")
      .insert({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        category: post.category,
        keywords: post.keywords,
        content: post.content,
        published: true,
        published_at: new Date().toISOString(),
      })
      .select("id, slug, title")
      .single();

    if (error || !inserted) {
      throw new Error(`Supabase insert failed: ${error?.message}`);
    }

    // 4. 완료 알림 이메일
    const postUrl = `https://tubeping.site/blog/${inserted.slug}`;
    await sendEmail(
      `✅ 새 블로그 자동 발행 — ${inserted.title}`,
      `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:auto;padding:20px">
         <h1 style="color:#C41E1E;margin-bottom:4px">새 블로그 글이 자동 발행되었습니다</h1>
         <p style="color:#666;margin-top:0">${source === "gsc" ? "GSC 거의 1페이지 키워드 기반" : "주제 풀 기반"}</p>
         <div style="background:#FFF8F8;border-left:4px solid #C41E1E;padding:16px;margin:16px 0;border-radius:4px">
           <h2 style="margin:0 0 8px;color:#111">${post.title}</h2>
           <p style="margin:0;color:#666;font-size:14px">${post.excerpt}</p>
         </div>
         <p><strong>카테고리:</strong> ${post.category}</p>
         <p><strong>키워드:</strong> ${post.keywords.join(", ")}</p>
         <p><strong>본문 길이:</strong> ${post.content.length}자</p>
         <p><strong>Q&amp;A 수:</strong> ${(post.content.match(/^##\s+Q\d*\./gm) || []).length}개</p>
         <div style="margin-top:24px;text-align:center">
           <a href="${postUrl}" style="display:inline-block;background:#C41E1E;color:white;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold">발행된 글 보기 →</a>
         </div>
         <p style="color:#999;font-size:12px;margin-top:32px;text-align:center">
           이 글은 AI가 자동 생성·발행했습니다. 문제가 있으면 Supabase에서 <code>published=false</code>로 변경하면 즉시 숨김 처리됩니다.
         </p>
       </div>`
    );

    return NextResponse.json({
      ok: true,
      source,
      post: { id: inserted.id, slug: inserted.slug, title: inserted.title, url: postUrl },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Auto-blog error:", msg);
    try {
      await sendEmail(
        "❌ TubePing 자동 블로그 — 에러",
        `<p>에러 발생: <code>${msg}</code></p>`
      );
    } catch {}
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

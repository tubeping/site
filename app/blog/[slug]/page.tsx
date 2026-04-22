import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabaseAdmin
    .from("blog_posts")
    .select("title, excerpt, keywords, published_at, category")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!data) return { title: "글을 찾을 수 없습니다" };

  const url = `https://tubeping.site/blog/${slug}`;

  return {
    title: data.title,
    description: data.excerpt,
    keywords: data.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: data.title,
      description: data.excerpt,
      type: "article",
      url,
      publishedTime: data.published_at,
      section: data.category,
      siteName: "TubePing",
      locale: "ko_KR",
      images: [
        {
          url: "https://tubeping.site/og-image.png",
          width: 1200,
          height: 630,
          alt: data.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.excerpt,
      images: ["https://tubeping.site/og-image.png"],
    },
  };
}

/* 마크다운 → HTML 변환 */
function markdownToHtml(md: string): string {
  // 줄바꿈 통일
  let s = md.replace(/\r\n/g, "\n");

  // 태그 줄 제거
  s = s.replace(/^태그:.*$/gm, "");
  // "튜핑 사이트" 링크 줄 제거 (이미 사이트 내)
  s = s.replace(/^👉👉\s*튜핑 사이트\s*[:：].*$/gm, "");
  // "튜핑 문의/입점" 링크 → 내부 링크
  s = s.replace(
    /👉👉\s*튜핑\s*(?:문의하기|입점 신청)\s*[:：]\s*https?:\/\/\S+/g,
    '👉👉 <a href="/#contact" class="text-[#C41E1E] font-bold hover:underline">튜핑 입점 신청 바로가기</a>'
  );
  // 나만의 쇼핑몰... 문장도 CTA로 정리
  s = s.replace(
    /나만의 쇼핑몰을 만들고 싶으신 크리에이터분들이라면[^<\n]*/g,
    '나만의 쇼핑몰을 만들고 싶으신 크리에이터분들이라면 지금 바로 튜핑에 문의해보세요.'
  );

  // 첫 H1 제거 (이미 제목 표시)
  s = s.replace(/^# .+$/m, "");

  // 테이블 변환 — 줄 단위로 처리
  const lines = s.split("\n");
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    // 테이블 헤더 감지: | xxx | yyy | 다음 줄이 |---|---|
    if (
      lines[i].trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^\|[\s:-]+\|/.test(lines[i + 1])
    ) {
      const headers = lines[i].split("|").filter(Boolean).map(h => h.trim());
      i += 2; // 헤더 + 구분선 skip
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").filter(Boolean).map(c => c.trim()));
        i++;
      }
      let html = '<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse rounded-xl overflow-hidden">';
      html += "<thead><tr>";
      for (const h of headers) {
        html += '<th class="bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3 text-left font-bold text-[#111111]">' + h + "</th>";
      }
      html += "</tr></thead><tbody>";
      for (const row of rows) {
        html += '<tr class="hover:bg-[#FAFAFA]">';
        for (const cell of row) {
          html += '<td class="border border-[#E5E7EB] px-4 py-3 text-[#444444]">' + cell + "</td>";
        }
        html += "</tr>";
      }
      html += "</tbody></table></div>";
      result.push(html);
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  s = result.join("\n");

  s = s
    // 헤딩
    .replace(/^### (.+)$/gm, '<h3 class="text-2xl font-extrabold text-[#111111] mt-10 mb-4 leading-tight">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-3xl font-extrabold text-[#111111] mt-14 mb-5 pb-3 border-b-2 border-[#C41E1E] leading-tight">$1</h2>')
    // URL → 클릭 가능 (이미 <a>로 감싸진 것은 제외)
    .replace(/(?<![">])(https?:\/\/[^\s<)"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#C41E1E] hover:underline break-all">$1</a>')
    // 굵게/이탤릭
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-[#111111]">$1</strong>')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
    // 리스트
    .replace(/^- (.+)$/gm, '<li class="ml-6 mb-2 list-disc text-[#333333] text-lg leading-relaxed">$1</li>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-6 mb-2 list-decimal text-[#333333] text-lg leading-relaxed">$2</li>')
    // Q&A 질문
    .replace(/^Q\d?\.\s*(.+)$/gm, '<p class="text-xl font-bold text-[#111111] mt-8 mb-2 pl-4 border-l-4 border-[#C41E1E]">Q. $1</p>')
    // 빈 줄 → 문단 구분
    .replace(/\n\n+/g, '</p><p class="text-lg text-[#333333] leading-[1.85] mb-5">')
    .replace(/\n/g, "<br/>")
    .replace(/^/, '<p class="text-lg text-[#333333] leading-[1.85] mb-5">');

  // 이모지로 시작하는 짧은 줄 (단락 헤더 역할) — 큰 글씨 + 굵게
  s = s.replace(
    /<p class="text-lg text-\[#333333\] leading-\[1\.85\] mb-5">([🔥📌⭐💡✅❌🎯📊🚀💰🎬📦🚚💸📣🤔🤷⚡🔑💬🎁🤝📈📍❓😩😰🙈😱]+\s*[^<]{0,80}?)<\/p>/g,
    '<p class="text-2xl font-extrabold text-[#111111] mt-12 mb-5 leading-tight">$1</p>'
  );

  // ✅로 시작하는 줄 (체크리스트 헤더) → 강조 박스
  s = s.replace(
    /<p class="text-lg text-\[#333333\] leading-\[1\.85\] mb-5">(✅\s*\d*\.?\s*[^<]+?)<\/p>/g,
    '<p class="text-xl font-bold text-[#111111] mt-8 mb-3 bg-[#FFF8F8] border-l-4 border-[#C41E1E] pl-4 py-2 rounded-r">$1</p>'
  );

  return s + "</p>";
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  const { data: post } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  const html = markdownToHtml(post.content);

  // AEO: 본문에서 Q&A 자동 추출 → FAQPage structured data
  // 패턴 1: "### Q1. 질문" / "### Q. 질문" 헤딩 + 다음 문단(다음 헤딩 전까지)
  // 패턴 2: "Q1. 질문" / "Q. 질문" 단독 줄 + 다음 문단
  const faqItems: { question: string; answer: string }[] = [];

  // 먼저 헤딩 형식(### Q...)을 우선 추출 — 가장 흔한 AEO 구조
  const headingQaRegex = /^#{2,4}\s+Q\d*\.\s+(.+?)$([\s\S]*?)(?=^#{2,4}\s|\n##\s|$)/gm;
  let m;
  while ((m = headingQaRegex.exec(post.content)) !== null) {
    const question = m[1].trim().replace(/\*\*/g, "");
    // 답변: 다음 헤딩 전까지, 마크다운 정리
    let answer = m[2]
      .trim()
      .replace(/^#{1,6}\s+.*$/gm, "") // 서브헤딩 제거
      .replace(/\*\*/g, "")
      .replace(/[-*]\s/g, "")
      .replace(/\|.*\|/g, "") // 테이블 행 제거
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    if (question && answer && answer.length > 20) {
      faqItems.push({ question, answer });
    }
  }

  // 백업: 단순 "Q1. ..." 패턴 (헤딩 추출이 실패했을 때만)
  if (faqItems.length === 0) {
    const plainQaRegex = /^Q\d*\.\s*(.+?)\n+([^#\nQ][\s\S]*?)(?=\nQ\d*\.|\n##|\n###|$)/gm;
    while ((m = plainQaRegex.exec(post.content)) !== null) {
      const question = m[1].trim().replace(/\*\*/g, "");
      const answer = m[2].trim().replace(/\*\*/g, "").replace(/[-*]\s/g, "").replace(/\n+/g, " ").slice(0, 500);
      if (question && answer) faqItems.push({ question, answer });
    }
  }

  const publisherOrg = {
    "@type": "Organization",
    "@id": "https://tubeping.site/#organization",
    name: "TubePing",
    alternateName: "튜핑",
    url: "https://tubeping.site",
    logo: {
      "@type": "ImageObject",
      url: "https://tubeping.site/favicon.png",
      width: 256,
      height: 256,
    },
    sameAs: [],
    parentOrganization: {
      "@type": "Organization",
      name: "㈜신산애널리틱스",
    },
    founder: { "@type": "Person", name: "최준" },
    foundingDate: "2025",
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `https://tubeping.site/blog/${slug}#article`,
    headline: post.title,
    description: post.excerpt,
    image: {
      "@type": "ImageObject",
      url: "https://tubeping.site/og-image.png",
      width: 1200,
      height: 630,
    },
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: publisherOrg,
    publisher: publisherOrg,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://tubeping.site/blog/${slug}`,
    },
    keywords: post.keywords?.join(", "),
    articleSection: post.category,
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
  };

  // AEO: FAQPage structured data (질문 2개 이상 있을 때만)
  const faqJsonLd =
    faqItems.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `https://tubeping.site/blog/${slug}#faq`,
          mainEntity: faqItems.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  // Breadcrumb structured data (검색결과 네비게이션)
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: "https://tubeping.site" },
      { "@type": "ListItem", position: 2, name: "블로그", item: "https://tubeping.site/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://tubeping.site/blog/${slug}` },
    ],
  };

  // 관련 글
  const { data: related } = await supabaseAdmin
    .from("blog_posts")
    .select("title, slug, category, published_at")
    .eq("published", true)
    .neq("slug", slug)
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F0F0F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-[#111111]">Ping</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-base text-[#666666] hover:text-[#111111] transition-colors">
              블로그
            </Link>
            <Link
              href="/#contact"
              className="bg-[#C41E1E] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#A01818] transition-colors"
            >
              입점 신청
            </Link>
          </div>
        </div>
      </nav>

      {/* Article */}
      <article className="pt-28 sm:pt-32 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#999999] mb-6">
            <Link href="/blog" className="hover:text-[#C41E1E] transition-colors">
              블로그
            </Link>
            <span>/</span>
            <span className="text-[#666666]">{post.category}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] leading-tight mb-6">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-[#F0F0F0]">
            <span className="text-sm text-[#666666]">
              {new Date(post.published_at).toLocaleDateString("ko", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="text-sm bg-[#FFF0F3] text-[#C41E1E] px-3 py-1 rounded-full font-medium">
              {post.category}
            </span>
          </div>

          {/* AEO: TL;DR — featured snippet 후보 */}
          <div className="mb-8 p-5 sm:p-6 bg-[#FFF8F8] border-l-4 border-[#C41E1E] rounded-r-xl">
            <div className="text-xs font-bold text-[#C41E1E] mb-2 tracking-wide">📌 핵심 요약</div>
            <p className="text-base sm:text-lg text-[#333333] leading-relaxed m-0">
              {post.excerpt}
            </p>
          </div>

          {/* Content */}
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Keywords */}
          {post.keywords?.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[#F0F0F0]">
              <div className="flex flex-wrap gap-2">
                {post.keywords.map((kw: string) => (
                  <span
                    key={kw}
                    className="text-sm bg-[#F3F4F6] text-[#666666] px-3 py-1 rounded-full"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-r from-[#C41E1E] to-[#FF6B6B] rounded-2xl p-8 sm:p-10 text-center text-white">
            <h3 className="text-2xl font-bold mb-2">
              크리에이터 커머스, 시작해보세요
            </h3>
            <p className="text-white/80 mb-6">
              초기 투자비 0원. 콘텐츠에만 집중하세요.
            </p>
            <Link
              href="/#contact"
              className="inline-block bg-white text-[#C41E1E] font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              무료 입점 신청
            </Link>
          </div>

          {/* Related */}
          {related && related.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold text-[#111111] mb-4">관련 글</h3>
              <div className="space-y-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="block bg-[#F9FAFB] rounded-xl p-4 hover:bg-[#FFF0F3] transition-colors"
                  >
                    <div className="font-medium text-[#111111] hover:text-[#C41E1E] transition-colors">
                      {r.title}
                    </div>
                    <div className="text-xs text-[#999999] mt-1">
                      {r.category} · {new Date(r.published_at).toLocaleDateString("ko")}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

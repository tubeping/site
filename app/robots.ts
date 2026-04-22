import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/api/", "/dashboard", "/onboarding", "/auth"];

  return {
    rules: [
      // 일반 검색엔진 크롤러
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      // Google 및 Naver는 블로그·랜딩페이지 전부 허용 (이미지 포함)
      {
        userAgent: ["Googlebot", "Googlebot-Image", "Yeti"],
        allow: "/",
        disallow,
      },
      // AI 크롤러 명시적 허용 (GEO)
      // 블로그 컨텐츠가 AI 검색·요약·답변에 인용되도록 허용
      {
        userAgent: [
          "GPTBot", // OpenAI ChatGPT
          "OAI-SearchBot", // OpenAI SearchGPT
          "ChatGPT-User",
          "ClaudeBot", // Anthropic Claude
          "Claude-Web",
          "anthropic-ai",
          "PerplexityBot", // Perplexity
          "Perplexity-User",
          "Google-Extended", // Google Bard/Gemini
          "Applebot-Extended", // Apple Intelligence
          "CCBot", // Common Crawl (여러 AI가 사용)
          "Bytespider", // TikTok/Doubao
          "FacebookBot",
          "meta-externalagent",
        ],
        allow: "/",
        disallow,
      },
    ],
    sitemap: "https://tubeping.site/sitemap.xml",
    host: "https://tubeping.site",
  };
}

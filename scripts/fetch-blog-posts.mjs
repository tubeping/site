/**
 * 블로그 글 전체 본문 덤프 (개선 작업용)
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DUMP_DIR = join(__dirname, "..", "content-improvements", "_originals");
mkdirSync(DUMP_DIR, { recursive: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from("blog_posts")
  .select("slug, title, excerpt, category, content, keywords, published_at")
  .eq("published", true);

if (error) {
  console.error(error);
  process.exit(1);
}

for (const p of data) {
  const body = `---
slug: ${p.slug}
title: ${p.title}
excerpt: ${p.excerpt}
category: ${p.category}
published_at: ${p.published_at}
keywords: ${JSON.stringify(p.keywords || [])}
---

${p.content}
`;
  writeFileSync(join(DUMP_DIR, `${p.slug}.md`), body, "utf-8");
  console.log(`✅ ${p.slug} (${p.content?.length || 0}자)`);
}

console.log(`\n📁 저장 위치: ${DUMP_DIR}`);

/**
 * 블로그 본문 일괄 업데이트 스크립트
 *
 * 사용법:
 *   1. c:/tubeping-site/.env.local 에 다음 2줄 있는지 확인
 *      NEXT_PUBLIC_SUPABASE_URL=...
 *      SUPABASE_SERVICE_ROLE_KEY=...
 *   2. 실행: npx tsx scripts/update-blog-content.mjs
 *   또는: node --env-file=.env.local scripts/update-blog-content.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMPROVEMENTS_DIR = join(__dirname, "..", "content-improvements");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 환경변수 없음. .env.local 확인 필요");
  console.error("   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const files = readdirSync(IMPROVEMENTS_DIR).filter((f) => f.endsWith(".md"));
  console.log(`📁 개선 파일 ${files.length}개 발견\n`);

  for (const file of files) {
    const slug = basename(file, extname(file));
    const content = readFileSync(join(IMPROVEMENTS_DIR, file), "utf-8");

    // 기존 제목 첫 줄 (# 제목)을 별도 처리
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const contentBody = content.replace(/^#\s+.+\n/m, "").trim();

    // DB 업데이트
    const { error } = await supabase
      .from("blog_posts")
      .update({
        content: contentBody,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);

    if (error) {
      console.error(`❌ ${slug}: ${error.message}`);
    } else {
      console.log(`✅ ${slug}: 업데이트 완료${titleMatch ? ` (제목: ${titleMatch[1].slice(0, 40)}...)` : ""}`);
    }
  }

  console.log("\n🎉 완료. 사이트 revalidate까지 최대 60초 소요.");
}

main().catch((e) => {
  console.error("💥 실패:", e);
  process.exit(1);
});

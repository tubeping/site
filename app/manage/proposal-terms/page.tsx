import { getProposalTerms } from "@/lib/site-settings";
import EditForm from "./_components/EditForm";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "공구 제안서 정책 편집 — TubePing 관리자",
  robots: { index: false, follow: false },
};

export default async function ProposalTermsPage() {
  const terms = await getProposalTerms();

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-white border-b border-[#F0F0F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-[#111111]">Ping</span>
            <span className="text-[#666666] text-xs ml-2 font-normal">관리자</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/proposal/TPCK00960"
              target="_blank"
              className="text-[#C41E1E] hover:underline"
            >
              미리보기 ↗
            </Link>
            <form action="/api/manage/logout" method="POST">
              <button type="submit" className="text-[#666666] hover:text-[#111111]">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] mb-2">
          공구 제안서 정책 편집
        </h1>
        <p className="text-sm text-[#666666] mb-6">
          여기서 수정한 내용은 모든 공구 제안서(<code className="bg-[#F3F4F6] px-1.5 py-0.5 rounded text-xs">/proposal/*</code>)에 즉시 반영됩니다.
        </p>
        <div className="bg-[#FFF8F8] border border-[#FFE0E0] rounded-xl px-4 py-3 text-xs text-[#C41E1E] mb-6">
          💡 굵게 표시: <code>**텍스트**</code> 형태로 입력하면 진하게 표시됩니다.
        </div>
        <EditForm initial={terms} />
      </main>
    </div>
  );
}

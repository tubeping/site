import LoginForm from "./_components/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 로그인 — TubePing",
  robots: { index: false, follow: false },
};

export default function ManageLoginPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#F0F0F0] p-8">
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">
          <span className="text-[#C41E1E]">Tube</span>
          <span className="text-[#111111]">Ping</span>
          <span className="text-[#666666] text-sm ml-2 font-normal">관리자</span>
        </h1>
        <p className="text-sm text-[#666666] mb-6">비밀번호를 입력하세요.</p>
        <LoginForm />
      </div>
    </div>
  );
}

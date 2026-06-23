"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/manage/proposal-terms";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/manage/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "로그인 실패");
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("네트워크 오류");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        required
        autoFocus
        className="w-full px-4 py-3 rounded-xl border-2 border-[#E0E0E0] text-base text-[#111111] focus:border-[#C41E1E] focus:outline-none"
      />
      {error && <div className="text-sm text-[#C41E1E]">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C41E1E] text-white font-bold py-3 rounded-xl hover:bg-[#A01818] transition-colors disabled:opacity-50"
      >
        {loading ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";

// ─── 타입 ───
type ScriptStatus = "draft" | "ready" | "published";
type Platform = "youtube" | "instagram" | "tiktok";

interface Cafe24Product {
  product_no: number;
  product_name: string;
  price: string;
  retail_price: string;
  supply_price: string;
  detail_image: string;
  list_image: string;
  small_image: string;
  selling: string;
  product_code: string;
  created_date: string;
  updated_date: string;
}

interface ScriptSection {
  key: string;
  label: string;
  placeholder: string;
}

interface GongguScript {
  id: string;
  productNo: number;
  productName: string;
  productImage: string;
  status: ScriptStatus;
  platforms: Platform[];
  createdAt: string;
  updatedAt: string;
  hook: string;
  intro: string;
  benefits: string;
  dealInfo: string;
  cta: string;
  memo: string;
  originalPrice: number;
  gongguPrice: number;
  gongguStart: string;
  gongguEnd: string;
}

const SCRIPT_SECTIONS: ScriptSection[] = [
  { key: "hook", label: "훅 (첫 마디)", placeholder: "시청자의 시선을 사로잡는 첫 문장. 예: \"이거 진짜 3개월 먹어봤는데...\"" },
  { key: "intro", label: "상품 소개", placeholder: "어떤 상품인지 간단히 소개. 브랜드, 특징, 왜 이 상품을 골랐는지" },
  { key: "benefits", label: "장점 / 효과", placeholder: "직접 써본 후기, 체감 효과, 다른 제품 대비 장점 등" },
  { key: "dealInfo", label: "공구 조건", placeholder: "가격, 할인율, 구성, 배송 정보, 기간 한정 등" },
  { key: "cta", label: "CTA (구매 유도)", placeholder: "링크 안내, 쿠폰코드, 마감 강조 등. 예: \"설명란 링크 타고 들어가시면...\"" },
  { key: "memo", label: "메모", placeholder: "촬영 시 참고할 내용, 주의사항, 협의 내용 등 (공개 안 됨)" },
];

const STORAGE_KEY = "tubeping_gonggu_scripts";

// ─── localStorage 헬퍼 ───
function loadScripts(): GongguScript[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveScripts(scripts: GongguScript[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

function statusBadge(s: ScriptStatus) {
  switch (s) {
    case "draft": return { label: "작성중", style: "bg-gray-100 text-gray-500" };
    case "ready": return { label: "준비완료", style: "bg-green-50 text-green-600" };
    case "published": return { label: "공구중", style: "bg-red-50 text-[#C41E1E]" };
  }
}

function platformIcon(p: Platform) {
  switch (p) {
    case "youtube": return "▶";
    case "instagram": return "◎";
    case "tiktok": return "♪";
  }
}

function platformLabel(p: Platform) {
  switch (p) {
    case "youtube": return "YouTube";
    case "instagram": return "Instagram";
    case "tiktok": return "TikTok";
  }
}

function platformColor(p: Platform) {
  switch (p) {
    case "youtube": return "bg-red-100 text-red-600";
    case "instagram": return "bg-purple-100 text-purple-600";
    case "tiktok": return "bg-gray-900 text-white";
  }
}

function discountRate(original: number, gonggu: number) {
  if (original <= 0) return 0;
  return Math.round((1 - gonggu / original) * 100);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── 메인 컴포넌트 ───
export default function ContentAnalytics() {
  const [scripts, setScripts] = useState<GongguScript[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | ScriptStatus>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // 카페24 상품 로딩 상태
  const [cafe24Products, setCafe24Products] = useState<Cafe24Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  // 초기 로드
  useEffect(() => {
    setScripts(loadScripts());
  }, []);

  // scripts 변경 시 저장
  useEffect(() => {
    if (scripts.length > 0) saveScripts(scripts);
  }, [scripts]);

  // 카페24 상품 불러오기
  const fetchProducts = useCallback(async (keyword?: string) => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/cafe24/products?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setCafe24Products(data.products || []);
    } catch (err) {
      setProductsError("상품을 불러올 수 없습니다. 카페24 연동을 확인해주세요.");
      console.error("Cafe24 fetch error:", err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // 상품 선택 팝업 열 때 로드
  useEffect(() => {
    if (showProductPicker) fetchProducts();
  }, [showProductPicker, fetchProducts]);

  const filtered = scripts
    .filter(s => filterStatus === "all" || s.status === filterStatus)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const counts = {
    all: scripts.length,
    draft: scripts.filter(s => s.status === "draft").length,
    ready: scripts.filter(s => s.status === "ready").length,
    published: scripts.filter(s => s.status === "published").length,
  };

  function handleSelectProduct(product: Cafe24Product) {
    const existing = scripts.find(s => s.productNo === product.product_no);
    if (existing) {
      setExpandedId(existing.id);
      setEditingId(existing.id);
      setShowProductPicker(false);
      return;
    }

    const price = parseFloat(product.price) || 0;
    const retailPrice = parseFloat(product.retail_price) || 0;

    const newScript: GongguScript = {
      id: `s_${product.product_no}_${Date.now()}`,
      productNo: product.product_no,
      productName: product.product_name.replace(/<[^>]*>/g, "").trim(),
      productImage: product.detail_image || product.list_image || product.small_image || "",
      status: "draft",
      platforms: ["youtube"],
      createdAt: today(),
      updatedAt: today(),
      hook: "", intro: "", benefits: "", dealInfo: "", cta: "", memo: "",
      originalPrice: retailPrice > 0 ? retailPrice : price,
      gongguPrice: price,
      gongguStart: "",
      gongguEnd: "",
    };

    setScripts(prev => {
      const next = [newScript, ...prev];
      saveScripts(next);
      return next;
    });
    setShowProductPicker(false);
    setExpandedId(newScript.id);
    setEditingId(newScript.id);
  }

  function handleSectionEdit(scriptId: string, sectionKey: string, value: string) {
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId ? { ...s, [sectionKey]: value, updatedAt: today() } : s
      );
      saveScripts(next);
      return next;
    });
  }

  function handleFieldEdit(scriptId: string, field: string, value: string | number | Platform[]) {
    setScripts(prev => {
      const next = prev.map(s =>
        s.id === scriptId ? { ...s, [field]: value, updatedAt: today() } : s
      );
      saveScripts(next);
      return next;
    });
  }

  function handleStatusChange(scriptId: string, newStatus: ScriptStatus) {
    handleFieldEdit(scriptId, "status", newStatus);
  }

  function handleDelete(scriptId: string) {
    setScripts(prev => {
      const next = prev.filter(s => s.id !== scriptId);
      saveScripts(next);
      return next;
    });
    if (editingId === scriptId) setEditingId(null);
    if (expandedId === scriptId) setExpandedId(null);
  }

  function handleCopyScript(script: GongguScript) {
    const fullScript = [
      script.hook && `${script.hook}\n`,
      script.intro && `${script.intro}\n`,
      script.benefits && `✅ 장점\n${script.benefits}\n`,
      script.dealInfo && `💰 공구 조건\n${script.dealInfo}\n`,
      script.cta && `👉 ${script.cta}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(fullScript);
    setCopied(script.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function togglePlatform(scriptId: string, p: Platform) {
    setScripts(prev => {
      const next = prev.map(s => {
        if (s.id !== scriptId) return s;
        const platforms = s.platforms.includes(p)
          ? s.platforms.filter(x => x !== p)
          : [...s.platforms, p];
        return { ...s, platforms: platforms.length > 0 ? platforms : [p], updatedAt: today() };
      });
      saveScripts(next);
      return next;
    });
  }

  return (
    <div className="p-4 sm:p-6">
      {/* 헤더 */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">공구 스크립트</h2>
          <p className="mt-1 text-sm text-gray-500">
            카페24 상품을 선택하고 공구 스크립트를 작성하세요
          </p>
        </div>
        <button
          onClick={() => setShowProductPicker(true)}
          className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a51919] transition-colors"
        >
          + 상품 선택
        </button>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">작성중</p>
          <p className="mt-1 text-2xl font-bold text-gray-400">{counts.draft}개</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">준비완료</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{counts.ready}개</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">공구중</p>
          <p className="mt-1 text-2xl font-bold text-[#C41E1E]">{counts.published}개</p>
        </div>
      </div>

      {/* ── 상품 선택 모달 ── */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl bg-white shadow-xl flex flex-col mx-4">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">카페24 상품 선택</h3>
              <button
                onClick={() => setShowProductPicker(false)}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 검색 */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") fetchProducts(searchKeyword); }}
                  placeholder="상품명으로 검색..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C41E1E] focus:outline-none focus:ring-1 focus:ring-[#C41E1E]"
                />
                <button
                  onClick={() => fetchProducts(searchKeyword)}
                  className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#a51919]"
                >
                  검색
                </button>
              </div>
            </div>

            {/* 상품 리스트 */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {productsLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#C41E1E]" />
                  <span className="ml-3 text-sm text-gray-500">상품 불러오는 중...</span>
                </div>
              )}

              {productsError && (
                <div className="rounded-lg bg-red-50 p-4 text-center">
                  <p className="text-sm text-red-600">{productsError}</p>
                  <button
                    onClick={() => fetchProducts()}
                    className="mt-2 cursor-pointer text-sm font-medium text-[#C41E1E] hover:underline"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {!productsLoading && !productsError && cafe24Products.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">
                  상품이 없습니다
                </div>
              )}

              <div className="space-y-2">
                {cafe24Products.map(product => {
                  const alreadyAdded = scripts.some(s => s.productNo === product.product_no);
                  const name = product.product_name.replace(/<[^>]*>/g, "").trim();
                  const price = parseFloat(product.price) || 0;
                  const imgSrc = product.list_image || product.small_image || product.detail_image || "";

                  return (
                    <button
                      key={product.product_no}
                      onClick={() => handleSelectProduct(product)}
                      className={`cursor-pointer w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        alreadyAdded
                          ? "border-[#C41E1E]/30 bg-red-50/30 hover:bg-red-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {/* 상품 이미지 */}
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={name}
                          className="h-14 w-14 rounded-lg object-cover shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="text-lg text-gray-300">📦</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatPrice(price)}원
                          {product.selling === "T" ? (
                            <span className="ml-2 text-green-500">판매중</span>
                          ) : (
                            <span className="ml-2 text-gray-400">미판매</span>
                          )}
                        </p>
                      </div>

                      {alreadyAdded && (
                        <span className="shrink-0 rounded-full bg-[#C41E1E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#C41E1E]">
                          추가됨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 필터 ── */}
      <div className="mb-4 flex gap-2 border-b border-gray-100 pb-4">
        {([
          { key: "all" as const, label: "전체" },
          { key: "draft" as const, label: "작성중" },
          { key: "ready" as const, label: "준비완료" },
          { key: "published" as const, label: "공구중" },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === f.key ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {/* ── 스크립트 리스트 ── */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">
              {scripts.length === 0 ? "카페24 상품을 선택해서 공구 스크립트를 만들어 보세요" : "해당 상태의 스크립트가 없습니다"}
            </p>
            {scripts.length === 0 && (
              <button
                onClick={() => setShowProductPicker(true)}
                className="mt-2 cursor-pointer text-sm font-medium text-[#C41E1E] hover:underline"
              >
                + 상품 선택하기
              </button>
            )}
          </div>
        )}

        {filtered.map(script => {
          const isExpanded = expandedId === script.id;
          const isEditing = editingId === script.id;
          const badge = statusBadge(script.status);
          const discount = discountRate(script.originalPrice, script.gongguPrice);
          const filledSections = SCRIPT_SECTIONS.filter(sec => (script as Record<string, unknown>)[sec.key]);

          return (
            <div key={script.id} className={`rounded-xl border bg-white transition-all ${isEditing ? "border-[#C41E1E]/40 shadow-sm" : "border-gray-200"}`}>
              {/* 카드 헤더 */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* 상품 이미지 */}
                  {script.productImage ? (
                    <img
                      src={script.productImage}
                      alt={script.productName}
                      className="h-14 w-14 rounded-lg object-cover shrink-0 border border-gray-100"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-lg text-gray-300">📦</span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* 상태 + 플랫폼 + 날짜 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.style}`}>
                        {badge.label}
                      </span>
                      {script.platforms.map(p => (
                        <span key={p} className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${platformColor(p)}`}>
                          {platformIcon(p)}
                        </span>
                      ))}
                      <span className="text-[11px] text-gray-400">수정 {script.updatedAt}</span>
                    </div>

                    {/* 상품명 */}
                    <h4 className="mt-1.5 text-sm font-semibold text-gray-900">{script.productName}</h4>

                    {/* 가격 */}
                    {script.originalPrice > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        {discount > 0 && (
                          <span className="text-xs text-gray-400 line-through">{formatPrice(script.originalPrice)}원</span>
                        )}
                        <span className="text-sm font-bold text-[#C41E1E]">{formatPrice(script.gongguPrice)}원</span>
                        {discount > 0 && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-[#C41E1E]">
                            {discount}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* 공구 기간 */}
                    {script.gongguStart && script.gongguEnd && (
                      <p className="mt-1 text-[11px] text-gray-400">
                        공구 기간: {script.gongguStart} ~ {script.gongguEnd}
                      </p>
                    )}

                    {/* 작성 진행도 */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-[#C41E1E] rounded-full transition-all"
                          style={{ width: `${(filledSections.length / SCRIPT_SECTIONS.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {filledSections.length}/{SCRIPT_SECTIONS.length} 섹션
                      </span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => { setExpandedId(isExpanded ? null : script.id); if (!isExpanded) setEditingId(null); }}
                      className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      {isExpanded ? "접기" : "보기"}
                    </button>
                    {isExpanded && (
                      <button
                        onClick={() => handleCopyScript(script)}
                        className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        {copied === script.id ? "✓ 복사됨" : "복사"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 펼친 상태 */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  {/* 편집 토글 + 상태 변경 */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingId(isEditing ? null : script.id)}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isEditing ? "bg-[#C41E1E] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {isEditing ? "편집중" : "편집"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">상태:</span>
                      <select
                        value={script.status}
                        onChange={e => handleStatusChange(script.id, e.target.value as ScriptStatus)}
                        className="cursor-pointer rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-[#C41E1E] focus:outline-none"
                      >
                        <option value="draft">작성중</option>
                        <option value="ready">준비완료</option>
                        <option value="published">공구중</option>
                      </select>
                      <button
                        onClick={() => handleDelete(script.id)}
                        className="cursor-pointer rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* 플랫폼 선택 (편집 모드) */}
                  {isEditing && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">게시 플랫폼</label>
                      <div className="flex gap-2">
                        {(["youtube", "instagram", "tiktok"] as Platform[]).map(p => (
                          <button
                            key={p}
                            onClick={() => togglePlatform(script.id, p)}
                            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              script.platforms.includes(p) ? platformColor(p) : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {platformIcon(p)} {platformLabel(p)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 스크립트 섹션들 */}
                  <div className="space-y-4">
                    {SCRIPT_SECTIONS.map(sec => {
                      const value = (script as Record<string, unknown>)[sec.key] as string;
                      return (
                        <div key={sec.key}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            {sec.label}
                          </label>
                          {isEditing ? (
                            <textarea
                              value={value}
                              onChange={e => handleSectionEdit(script.id, sec.key, e.target.value)}
                              placeholder={sec.placeholder}
                              rows={sec.key === "memo" ? 2 : 3}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-[#C41E1E] focus:outline-none focus:ring-1 focus:ring-[#C41E1E] resize-y"
                            />
                          ) : (
                            <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                              value ? "bg-gray-50 text-gray-800" : "bg-gray-50 text-gray-300 italic"
                            }`}>
                              {value || sec.placeholder}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 공구 정보 편집 */}
                  {isEditing && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">공구 정보</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">정가 (원)</label>
                          <input
                            type="number"
                            value={script.originalPrice || ""}
                            onChange={e => handleFieldEdit(script.id, "originalPrice", parseInt(e.target.value) || 0)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-[#C41E1E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">공구가 (원)</label>
                          <input
                            type="number"
                            value={script.gongguPrice || ""}
                            onChange={e => handleFieldEdit(script.id, "gongguPrice", parseInt(e.target.value) || 0)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-[#C41E1E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">공구 시작일</label>
                          <input
                            type="date"
                            value={script.gongguStart || ""}
                            onChange={e => handleFieldEdit(script.id, "gongguStart", e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-[#C41E1E] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">공구 종료일</label>
                          <input
                            type="date"
                            value={script.gongguEnd || ""}
                            onChange={e => handleFieldEdit(script.id, "gongguEnd", e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-[#C41E1E] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 하단 팁 ── */}
      <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-700 mb-2">공구 스크립트 작성 팁</p>
        <ul className="space-y-1.5 text-[11px] text-gray-500">
          <li className="flex gap-2"><span className="text-[#C41E1E]">1.</span> 훅은 15초 안에 시청자를 잡아야 합니다 — 궁금증 or 공감으로 시작하세요</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">2.</span> 장점은 직접 체험한 내용 위주로 3가지 이내로 정리하세요</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">3.</span> 공구 조건은 숫자(가격, 할인율, 기간)를 명확하게 보여주세요</li>
          <li className="flex gap-2"><span className="text-[#C41E1E]">4.</span> CTA에는 구매 링크 위치와 마감 시한을 반드시 포함하세요</li>
        </ul>
      </div>
    </div>
  );
}

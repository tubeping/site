"use client";

import { useState } from "react";

// ─── 더미 데이터 ───
const GROUP_PRODUCTS = [
  { id: 1, name: "프리미엄 에코백", price: 29000, margin: 35, groupPrice: 19900, category: "생활", isNew: false },
  { id: 2, name: "스테인리스 텀블러", price: 35000, margin: 42, groupPrice: 22000, category: "생활", isNew: true },
  { id: 3, name: "캠핑 랜턴", price: 58000, margin: 38, groupPrice: 35800, category: "생활", isNew: false },
  { id: 4, name: "다용도 파우치", price: 15000, margin: 50, groupPrice: 8900, category: "패션", isNew: false },
  { id: 5, name: "미니 선풍기", price: 22000, margin: 44, groupPrice: 13200, category: "생활", isNew: false },
  { id: 6, name: "핸드크림 세트", price: 18000, margin: 48, groupPrice: 10500, category: "뷰티", isNew: true },
  { id: 7, name: "노트 세트", price: 12000, margin: 55, groupPrice: 6500, category: "생활", isNew: false },
  { id: 8, name: "볼캡 모자", price: 32000, margin: 40, groupPrice: 19500, category: "패션", isNew: false },
];

const COUPANG_DUMMY_PRODUCT = {
  name: "삼성 갤럭시 버즈3 프로",
  price: 289000,
  commission: 3.5,
};

const NAVER_DUMMY_PRODUCT = {
  name: "오설록 제주 녹차 선물세트",
  price: 35000,
};

const REQUEST_HISTORY = [
  { id: 1, name: "나이키 에어맥스 97", date: "2026-03-28", status: "검토 중" as const },
  { id: 2, name: "다이슨 에어랩", date: "2026-03-25", status: "소싱 완료" as const },
  { id: 3, name: "아이패드 프로 M4", date: "2026-03-20", status: "소싱 불가" as const },
];

// ─── 타입 ───
type Tab = "group" | "coupang" | "naver" | "request";
type Category = "전체" | "패션" | "생활" | "식품" | "뷰티";
type RequestStatus = "검토 중" | "소싱 완료" | "소싱 불가";

interface CoupangProduct {
  name: string;
  price: number;
  commission: number;
}

interface NaverProduct {
  name: string;
  price: number;
}

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

const IMAGE_PLACEHOLDER = (
  <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IMAGE_PLACEHOLDER_SM = (
  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IMAGE_PLACEHOLDER_XS = (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DELETE_ICON = (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ─── 메인 컴포넌트 ───
export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState<Tab>("group");

  // 공구상품 상태
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set([1, 3, 5]));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");

  // 쿠팡 파트너스 상태
  const [coupangAccessKey, setCoupangAccessKey] = useState("");
  const [coupangSecretKey, setCoupangSecretKey] = useState("");
  const [isCoupangConnected, setIsCoupangConnected] = useState(false);
  const [coupangUrl, setCoupangUrl] = useState("");
  const [coupangPreview, setCoupangPreview] = useState<CoupangProduct | null>(null);
  const [coupangAdded, setCoupangAdded] = useState<CoupangProduct[]>([]);

  // 네이버/기타 상태
  const [naverUrl, setNaverUrl] = useState("");
  const [naverPreview, setNaverPreview] = useState<NaverProduct | null>(null);
  const [naverAdded, setNaverAdded] = useState<NaverProduct[]>([]);

  // 상품 조르기 상태
  const [requestName, setRequestName] = useState("");
  const [requestLink, setRequestLink] = useState("");
  const [requestDesc, setRequestDesc] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // ─── 핸들러 ───
  const toggleAdd = (id: number) => {
    setAddedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredProducts = GROUP_PRODUCTS.filter((p) => {
    const matchCategory = selectedCategory === "전체" || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const addedCount = addedIds.size;

  const handleCoupangConnect = () => {
    if (coupangAccessKey.trim() && coupangSecretKey.trim()) {
      setIsCoupangConnected(true);
    }
  };

  const handleCoupangReset = () => {
    setIsCoupangConnected(false);
    setCoupangAccessKey("");
    setCoupangSecretKey("");
    setCoupangPreview(null);
    setCoupangUrl("");
  };

  const handleCoupangFetch = () => {
    if (coupangUrl.trim()) {
      setCoupangPreview(COUPANG_DUMMY_PRODUCT);
    }
  };

  const handleCoupangAdd = () => {
    if (coupangPreview) {
      setCoupangAdded((prev) => [...prev, coupangPreview]);
      setCoupangPreview(null);
      setCoupangUrl("");
    }
  };

  const handleNaverFetch = () => {
    if (naverUrl.trim()) {
      setNaverPreview(NAVER_DUMMY_PRODUCT);
    }
  };

  const handleNaverAdd = () => {
    if (naverPreview) {
      setNaverAdded((prev) => [...prev, naverPreview]);
      setNaverPreview(null);
      setNaverUrl("");
    }
  };

  const handleRequestSubmit = () => {
    if (!requestName.trim() || !requestLink.trim()) return;
    setToastMessage("요청이 성공적으로 전송되었습니다!");
    setRequestName("");
    setRequestLink("");
    setRequestDesc("");
    setTimeout(() => setToastMessage(""), 3000);
  };

  const statusStyle = (status: RequestStatus) => {
    switch (status) {
      case "검토 중":
        return "bg-yellow-100 text-yellow-700";
      case "소싱 완료":
        return "bg-green-100 text-green-700";
      case "소싱 불가":
        return "bg-red-100 text-red-700";
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "group", label: "공구상품" },
    { key: "coupang", label: "쿠팡 파트너스" },
    { key: "naver", label: "네이버·기타" },
    { key: "request", label: "상품 조르기" },
  ];

  const CATEGORIES: Category[] = ["전체", "패션", "생활", "식품", "뷰티"];

  return (
    <div className="w-full">
      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 rounded-lg bg-green-600 px-5 py-3 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* ─── 탭 헤더 ─── */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-3 text-sm cursor-pointer transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-[#C41E1E] font-medium text-[#C41E1E]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.key === "group" && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C41E1E] px-1.5 text-xs text-white">
                  {addedCount}
                </span>
              )}
              {tab.key === "coupang" && isCoupangConnected && (
                <span className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* ─── 탭 콘텐츠 ─── */}
      <div className="p-5">
        {/* ━━━ 공구상품 ━━━ */}
        {activeTab === "group" && (
          <div>
            {/* 툴바 */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="상품 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div className="flex gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                      selectedCategory === cat
                        ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]"
                        : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-sm text-gray-500">
                추가됨 <span className="font-medium text-[#C41E1E]">{addedCount}</span>개
              </span>
            </div>

            {/* 상품 그리드 */}
            <div className="grid grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isAdded = addedIds.has(product.id);
                return (
                  <div
                    key={product.id}
                    className={`overflow-hidden rounded-xl border transition-colors ${
                      isAdded ? "border-[#C41E1E]" : "border-gray-200"
                    }`}
                  >
                    {/* 이미지 */}
                    <div className="relative aspect-square bg-gray-100">
                      <div className="flex h-full items-center justify-center text-gray-300">
                        {IMAGE_PLACEHOLDER}
                      </div>
                      {product.isNew && (
                        <span className="absolute left-2 top-2 rounded bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                          NEW
                        </span>
                      )}
                      {isAdded && (
                        <span className="absolute right-2 top-2 rounded bg-[#C41E1E] px-2 py-0.5 text-xs font-medium text-white">
                          추가됨
                        </span>
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="mt-1 text-base font-bold text-[#C41E1E]">
                        {formatPrice(product.price)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        마진율 {product.margin}% · 공구가 {formatPrice(product.groupPrice)}
                      </p>
                      <button
                        onClick={() => toggleAdd(product.id)}
                        className={`mt-3 w-full cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${
                          isAdded
                            ? "bg-gray-100 text-gray-500"
                            : "bg-[#C41E1E] text-white hover:bg-[#A01818]"
                        }`}
                      >
                        {isAdded ? "✓ 추가됨" : "내 쇼핑몰에 추가"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 푸터 */}
            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-500">
              <span>총 {filteredProducts.length}개 상품</span>
              <span>
                내 쇼핑몰 추가: <span className="font-medium text-[#C41E1E]">{addedCount}</span>개
              </span>
            </div>
          </div>
        )}

        {/* ━━━ 쿠팡 파트너스 ━━━ */}
        {activeTab === "coupang" && (
          <div className="space-y-6">
            {/* API 연동 카드 */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">쿠팡 파트너스 API 연동</h3>
                {isCoupangConnected ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    연결됨
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                    미연결
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Access Key"
                  value={isCoupangConnected ? "••••••••••••••••" : coupangAccessKey}
                  onChange={(e) => setCoupangAccessKey(e.target.value)}
                  disabled={isCoupangConnected}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E] disabled:bg-gray-50 disabled:text-gray-400"
                />
                <input
                  type="password"
                  placeholder="Secret Key"
                  value={isCoupangConnected ? "••••••••••••••••" : coupangSecretKey}
                  onChange={(e) => setCoupangSecretKey(e.target.value)}
                  disabled={isCoupangConnected}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E] disabled:bg-gray-50 disabled:text-gray-400"
                />
                <div className="flex gap-2">
                  {!isCoupangConnected ? (
                    <button
                      onClick={handleCoupangConnect}
                      className="cursor-pointer rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                    >
                      연결하기
                    </button>
                  ) : (
                    <button
                      onClick={handleCoupangReset}
                      className="cursor-pointer rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      재설정
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                <span className="cursor-pointer text-[#C41E1E] hover:underline">
                  쿠팡 파트너스 키 발급 →
                </span>
              </p>
            </div>

            {/* URL 입력 영역 */}
            <div className={!isCoupangConnected ? "pointer-events-none opacity-50" : ""}>
              <div className="rounded-xl border border-gray-200 p-5">
                <h4 className="mb-3 text-sm font-medium text-gray-700">상품 URL 입력</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="쿠팡 상품 URL을 입력하세요"
                    value={coupangUrl}
                    onChange={(e) => setCoupangUrl(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                  />
                  <button
                    onClick={handleCoupangFetch}
                    className="cursor-pointer whitespace-nowrap rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                  >
                    상품 가져오기
                  </button>
                </div>

                {/* 미리보기 */}
                {coupangPreview && (
                  <div className="mt-4 flex items-center gap-4 rounded-lg border border-gray-200 p-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                      {IMAGE_PLACEHOLDER_SM}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{coupangPreview.name}</p>
                      <p className="mt-1 text-base font-bold text-[#C41E1E]">
                        {formatPrice(coupangPreview.price)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        예상 수수료 수익: {formatPrice(Math.round(coupangPreview.price * coupangPreview.commission / 100))} ({coupangPreview.commission}%)
                      </p>
                    </div>
                    <button
                      onClick={handleCoupangAdd}
                      className="shrink-0 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]"
                    >
                      내 쇼핑몰에 추가
                    </button>
                  </div>
                )}
              </div>

              {/* 추가된 상품 목록 */}
              {coupangAdded.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">추가된 상품</h4>
                  {coupangAdded.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-300">
                        {IMAGE_PLACEHOLDER_XS}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatPrice(item.price)} · 수수료 {item.commission}%
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setCoupangAdded((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="cursor-pointer text-gray-400 hover:text-red-500"
                      >
                        {DELETE_ICON}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ━━━ 네이버·기타 ━━━ */}
        {activeTab === "naver" && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-gray-500">
              네이버 스마트스토어, 자사몰 등 외부 링크를 추가할 수 있어요.
              <br />
              URL을 붙여넣으면 상품 정보를 자동으로 가져옵니다.
            </p>

            {/* URL 입력 */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="상품 URL을 입력하세요"
                  value={naverUrl}
                  onChange={(e) => setNaverUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
                <button
                  onClick={handleNaverFetch}
                  className="cursor-pointer whitespace-nowrap rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                >
                  상품 가져오기
                </button>
              </div>

              {/* 미리보기 */}
              {naverPreview && (
                <div className="mt-4 flex items-center gap-4 rounded-lg border border-gray-200 p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                    {IMAGE_PLACEHOLDER_SM}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{naverPreview.name}</p>
                    <p className="mt-1 text-base font-bold text-[#C41E1E]">
                      {formatPrice(naverPreview.price)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">외부 링크 연결</p>
                  </div>
                  <button
                    onClick={handleNaverAdd}
                    className="shrink-0 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]"
                  >
                    내 쇼핑몰에 추가
                  </button>
                </div>
              )}
            </div>

            {/* 추가된 상품 목록 */}
            {naverAdded.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">추가된 상품</h4>
                {naverAdded.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-300">
                      {IMAGE_PLACEHOLDER_XS}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatPrice(item.price)} · 외부 링크
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setNaverAdded((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="cursor-pointer text-gray-400 hover:text-red-500"
                    >
                      {DELETE_ICON}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ━━━ 상품 조르기 ━━━ */}
        {activeTab === "request" && (
          <div className="space-y-6">
            {/* 안내 박스 */}
            <div className="rounded-lg border-l-[3px] border-l-[#C41E1E] bg-red-50 p-4">
              <p className="text-sm leading-relaxed text-gray-700">
                원하는 상품이 없나요? 튜핑에 소싱을 요청해보세요.
                <br />
                검토 후 공구상품으로 등록되면 알림을 드릴게요.
              </p>
            </div>

            {/* 입력 폼 */}
            <div className="space-y-4 rounded-xl border border-gray-200 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  상품명 <span className="text-[#C41E1E]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="요청할 상품명을 입력하세요"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  상품 링크 <span className="text-[#C41E1E]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="상품 URL을 입력하세요"
                  value={requestLink}
                  onChange={(e) => setRequestLink(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  간단한 설명 <span className="text-gray-400">(선택)</span>
                </label>
                <textarea
                  placeholder="요청 사유나 참고사항을 입력하세요"
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleRequestSubmit}
                  className="cursor-pointer rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#A01818]"
                >
                  튜핑에 요청 보내기
                </button>
              </div>
            </div>

            {/* 요청 내역 */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700">요청 내역</h4>
              <div className="space-y-2">
                {REQUEST_HISTORY.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(req.status)}`}
                      >
                        {req.status}
                      </span>
                      <span className="text-sm text-gray-900">{req.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{req.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

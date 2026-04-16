"use client";

import { useState, useEffect, useCallback } from "react";

// ─── 타입 ───
type SourceType = "tubeping_campaign" | "coupang" | "naver" | "own" | "other";
type FilterKey = "all" | SourceType;

interface PickItem {
  id: string;
  source_type: SourceType;
  product_id: string | null;
  external_url: string | null;
  affiliate_code: string | null;
  source_meta: Record<string, unknown>;
  display_order: number;
  visible: boolean;
  curation_comment: string;
  clicks: number;
  conversions: number;
  name: string;
  category: string;
  price: number;
  image: string | null;
  revenue: number;
}

interface Cafe24Product {
  product_no: number;
  product_code: string;
  product_name: string;
  price: string;
  supply_price: string;
  detail_image: string;
  list_image: string;
  small_image: string;
  selling: string;
  sold_out: string;
  created_date: string;
}

interface CoupangSearchProduct {
  productId: number;
  productName: string;
  productPrice: number;
  productImage: string;
  productUrl: string;
  categoryName: string;
  rank: number;
  isRocket: boolean;
}

// ─── 더미 데이터 ───
const FALLBACK_PICKS: PickItem[] = [
  {
    id: "p1", source_type: "tubeping_campaign", product_id: null, external_url: null,
    affiliate_code: null, source_meta: {}, display_order: 0, visible: true,
    curation_comment: "저도 매일 먹는 비타민입니다. 흡수가 잘 돼요.",
    clicks: 342, conversions: 47, revenue: 1840000,
    name: "프리미엄 비타민C 5000mg 90정", category: "건강식품", price: 29900,
    image: "https://ecimg.cafe24img.com/pg1119b83992236021/shinsana/web/product/medium/20250623/c01e2014421c64300ca8a4c31d0d6ec9.jpg",
  },
  {
    id: "p2", source_type: "tubeping_campaign", product_id: null, external_url: null,
    affiliate_code: null, source_meta: {}, display_order: 1, visible: true,
    curation_comment: "", clicks: 198, conversions: 23, revenue: 894700,
    name: "유기농 프로틴 파우더 1kg", category: "건강식품", price: 38900, image: null,
  },
  {
    id: "p3", source_type: "coupang", product_id: null,
    external_url: "https://www.coupang.com/vp/products/123456",
    affiliate_code: "AF1234", source_meta: { commission_rate: 3 },
    display_order: 2, visible: true, curation_comment: "우리집 필수템!",
    clicks: 234, conversions: 8, revenue: 180000,
    name: "에어프라이어 5.5L 대용량", category: "생활", price: 89900, image: null,
  },
  {
    id: "p4", source_type: "naver", product_id: null,
    external_url: "https://smartstore.naver.com/example/products/789",
    affiliate_code: null, source_meta: {},
    display_order: 3, visible: false, curation_comment: "",
    clicks: 45, conversions: 2, revenue: 14000,
    name: "오설록 제주 녹차 선물세트", category: "식품", price: 35000, image: null,
  },
  {
    id: "p5", source_type: "own", product_id: null,
    external_url: "https://myshop.com/glass-cup",
    affiliate_code: null, source_meta: { custom_price: 40000, custom_image: null },
    display_order: 4, visible: true, curation_comment: "직접 디자인했어요",
    clicks: 567, conversions: 42, revenue: 1680000,
    name: "수현's 커스텀 유리컵", category: "생활", price: 40000, image: null,
  },
];

// ─── 유틸 ───
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function sourceLabel(source: SourceType) {
  const map: Record<SourceType, string> = {
    tubeping_campaign: "공구", coupang: "쿠팡", naver: "네이버", own: "직접", other: "기타",
  };
  return map[source];
}

function sourceBadgeStyle(source: SourceType) {
  const map: Record<SourceType, string> = {
    tubeping_campaign: "bg-[#C41E1E] text-white",
    coupang: "bg-[#e44232] text-white",
    naver: "bg-[#03C75A] text-white",
    own: "bg-[#111111] text-white",
    other: "bg-gray-500 text-white",
  };
  return map[source];
}

const IMAGE_PLACEHOLDER = (
  <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 공구 탭: Cafe24 인벤토리 바둑판 그리드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function GongguTab({
  picks,
  onAddPick,
  onRemovePick,
  onToggleVisible,
  onEditComment,
}: {
  picks: PickItem[];
  onAddPick: (partial: Partial<PickItem>) => void;
  onRemovePick: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onEditComment: (id: string, comment: string) => void;
}) {
  const [products, setProducts] = useState<Cafe24Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const FALLBACK_CATEGORIES = [
    { id: 42, name: "식품" }, { id: 46, name: "건강" }, { id: 53, name: "생활" },
    { id: 47, name: "패션/뷰티" }, { id: 52, name: "캠핑/여행" }, { id: 51, name: "디지털/가전" },
  ];
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(FALLBACK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const PAGE_SIZE = 40;

  const pickedProductNos = new Set(
    picks
      .filter((p) => p.source_type === "tubeping_campaign")
      .map((p) => p.source_meta?.cafe24_product_no as number)
      .filter(Boolean)
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/cafe24/categories");
      if (!res.ok) return;
      const data = await res.json();
      if (data.categories?.length > 0) setCategories(data.categories);
    } catch { /* 폴백 카테고리 유지 */ }
  }, []);

  const fetchProducts = useCallback(async (opts?: { keyword?: string; category?: number | null; append?: boolean }) => {
    const isAppend = opts?.append || false;
    if (isAppend) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const nextOffset = isAppend ? offset + PAGE_SIZE : 0;
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(isAppend ? nextOffset : 0) });
      if (opts?.keyword?.trim()) params.set("keyword", opts.keyword.trim());
      const cat = opts?.category !== undefined ? opts.category : selectedCategory;
      if (cat) params.set("category", String(cat));
      const res = await fetch(`/api/cafe24/products?${params}`);
      if (!res.ok) throw new Error("API 오류");
      const data = await res.json();
      const list = data.products || [];
      if (isAppend) {
        setProducts((prev) => [...prev, ...list]);
        setOffset(nextOffset);
      } else {
        setProducts(list);
        setOffset(0);
      }
      setHasMore(list.length >= PAGE_SIZE);
      setLoaded(true);
    } catch {
      setError("상품을 불러올 수 없습니다. 카페24 연동을 확인해주세요.");
      if (!isAppend) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, selectedCategory]);

  useEffect(() => {
    if (!loaded) {
      fetchProducts();
      fetchCategories();
    }
  }, [loaded, fetchProducts, fetchCategories]);

  const handleCategoryChange = (catId: number | null) => {
    setSelectedCategory(catId);
    setLoaded(false);
    fetchProducts({ category: catId, keyword: search || undefined });
  };

  const handleSearch = () => {
    setLoaded(false);
    fetchProducts({ keyword: search || undefined });
  };

  const handleAddToPick = (product: Cafe24Product) => {
    onAddPick({
      source_type: "tubeping_campaign",
      name: product.product_name,
      price: Number(product.price),
      category: categories.find((c) => c.id === selectedCategory)?.name || "",
      image: product.list_image || product.detail_image || null,
      source_meta: {
        cafe24_product_no: product.product_no,
        cafe24_product_code: product.product_code,
        supply_price: Number(product.supply_price),
        name: product.product_name,
        price: Number(product.price),
        image: product.list_image || product.detail_image || null,
      },
    });
  };

  const gongguPicks = picks.filter((p) => p.source_type === "tubeping_campaign");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  return (
    <div className="space-y-6">
      {/* 이미 PICK된 공구 상품 */}
      {gongguPicks.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            내 공구 PICK <span className="text-[#C41E1E]">{gongguPicks.length}</span>
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {gongguPicks.map((pick) => (
              <div key={pick.id} className={`overflow-hidden rounded-lg border transition-colors ${pick.visible ? "border-[#C41E1E]" : "border-gray-200 opacity-60"}`}>
                <div className="relative aspect-[4/3] bg-gray-100">
                  {pick.image ? (
                    <img src={pick.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded bg-[#C41E1E] px-1.5 py-0.5 text-[9px] font-medium text-white">공구</span>
                </div>
                <div className="p-2">
                  <p className="line-clamp-1 text-xs font-medium text-gray-900">{pick.name}</p>
                  <p className="mt-0.5 text-sm font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>
                  <div className="mt-1 flex gap-2 text-[10px] text-gray-400">
                    <span>클릭 {pick.clicks}</span><span>전환 {pick.conversions}</span>
                  </div>
                  {editingId === pick.id ? (
                    <div className="mt-1.5 flex gap-1">
                      <input type="text" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="코멘트"
                        className="flex-1 rounded border border-gray-300 px-1.5 py-0.5 text-[10px] outline-none focus:border-[#C41E1E]"
                        onKeyDown={(e) => { if (e.key === "Enter") { onEditComment(pick.id, commentDraft); setEditingId(null); } }} />
                      <button onClick={() => { onEditComment(pick.id, commentDraft); setEditingId(null); }}
                        className="cursor-pointer rounded bg-[#C41E1E] px-1.5 py-0.5 text-[9px] text-white">저장</button>
                    </div>
                  ) : pick.curation_comment ? (
                    <button onClick={() => { setEditingId(pick.id); setCommentDraft(pick.curation_comment); }}
                      className="mt-1 block w-full text-left text-[10px] italic text-gray-400 hover:text-gray-600 cursor-pointer truncate">
                      &ldquo;{pick.curation_comment}&rdquo;
                    </button>
                  ) : null}
                  <div className="mt-1.5 flex gap-1">
                    <button onClick={() => onToggleVisible(pick.id)} className={`flex-1 cursor-pointer rounded py-1 text-[10px] font-medium ${pick.visible ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {pick.visible ? "노출" : "숨김"}
                    </button>
                    <button onClick={() => onRemovePick(pick.id)} className="flex-1 cursor-pointer rounded bg-gray-50 py-1 text-[10px] text-gray-400 hover:text-red-500">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {gongguPicks.length > 0 && (
        <div className="border-t border-dashed border-gray-200 pt-2">
          <p className="text-xs text-gray-400">카페24 인벤토리에서 상품을 골라 PICK에 추가하세요</p>
        </div>
      )}

      {/* Cafe24 인벤토리 브라우저 */}
      <div>
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="공구 상품명으로 검색" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-20 text-sm outline-none focus:border-[#C41E1E]" />
            <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]">검색</button>
          </div>
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button onClick={() => handleCategoryChange(null)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${selectedCategory === null ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}>전체</button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${selectedCategory === cat.id ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}>{cat.name}</button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
              <p className="text-sm text-gray-500">카페24에서 상품을 불러오는 중...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-gray-600">{error}</p>
            <button onClick={() => fetchProducts()} className="mt-3 cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]">다시 시도</button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-gray-500">{search ? `"${search}" 검색 결과` : "전체 공구 상품"} · {products.length}개</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {products.map((product) => {
                const isPicked = pickedProductNos.has(product.product_no);
                const price = Number(product.price);
                const isSoldOut = product.sold_out === "T";
                return (
                  <div key={product.product_no} className={`overflow-hidden rounded-lg border transition-colors ${isPicked ? "border-[#C41E1E]" : "border-gray-200 hover:border-gray-300"} ${isSoldOut ? "opacity-50" : ""}`}>
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {product.list_image || product.detail_image ? (
                        <img src={product.list_image || product.detail_image} alt={product.product_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                      )}
                      {isSoldOut && <span className="absolute left-1.5 top-1.5 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-white">품절</span>}
                      {isPicked && <span className="absolute right-1.5 top-1.5 rounded bg-[#C41E1E] px-1.5 py-0.5 text-[10px] font-medium text-white">PICK</span>}
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-1 text-xs font-medium text-gray-900">{product.product_name}</p>
                      <p className="mt-0.5 text-sm font-bold text-[#C41E1E]">{formatPrice(price)}</p>
                      <p className="text-[10px] text-gray-400">공급가 {formatPrice(Number(product.supply_price))}</p>
                      <button onClick={() => !isSoldOut && !isPicked && handleAddToPick(product)} disabled={isSoldOut || isPicked}
                        className={`mt-1.5 w-full cursor-pointer rounded py-1.5 text-xs font-medium transition-colors ${isSoldOut ? "bg-gray-100 text-gray-400 cursor-default" : isPicked ? "bg-gray-100 text-gray-500 cursor-default" : "bg-[#C41E1E] text-white hover:bg-[#A01818]"}`}>
                        {isSoldOut ? "품절" : isPicked ? "PICK 완료" : "PICK 추가"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !error && hasMore && products.length > 0 && (
          <div className="mt-5 flex justify-center">
            <button onClick={() => fetchProducts({ append: true, keyword: search || undefined })} disabled={loadingMore}
              className="cursor-pointer rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              {loadingMore ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />불러오는 중...</span> : "더보기"}
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && loaded && (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-gray-500">{search ? `"${search}"에 해당하는 상품이 없습니다` : "등록된 공구 상품이 없습니다"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 쿠팡 파트너스 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CoupangTab({
  picks,
  onAddPick,
  onRemovePick,
  onToggleVisible,
}: {
  picks: PickItem[];
  onAddPick: (partial: Partial<PickItem>) => void;
  onRemovePick: (id: string) => void;
  onToggleVisible: (id: string) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<CoupangSearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "price_low" | "price_high">("rank");
  const [selectedProduct, setSelectedProduct] = useState<CoupangSearchProduct | null>(null);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  const CATEGORIES = ["전체", "식품", "로켓프레시", "생활용품", "주방용품", "가구/홈인테리어", "가전/디지털", "패션/의류", "뷰티", "스포츠"];
  const [selectedCat, setSelectedCat] = useState("전체");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ak = localStorage.getItem("coupang_access_key") || "";
    const sk = localStorage.getItem("coupang_secret_key") || "";
    if (ak && sk) { setIsConnected(true); setAccessKey(ak); setSecretKey(sk); }
  }, []);

  const handleConnect = () => {
    if (!accessKey.trim() || !secretKey.trim()) return;
    localStorage.setItem("coupang_access_key", accessKey);
    localStorage.setItem("coupang_secret_key", secretKey);
    setIsConnected(true); setShowConnectModal(false);
    setToastMessage("쿠팡 파트너스 연동 완료!"); setTimeout(() => setToastMessage(""), 3000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setHasSearched(true);
    try {
      const res = await fetch(`/api/coupang/search?keyword=${encodeURIComponent(searchQuery)}&limit=20`, {
        headers: { "x-coupang-access-key": accessKey, "x-coupang-secret-key": secretKey },
      });
      if (res.ok) { const data = await res.json(); setResults(data.data || []); }
      else setResults([]);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const handleGenerateLink = async (product: CoupangSearchProduct) => {
    setSelectedProduct(product); setGeneratingLink(true);
    try {
      const res = await fetch("/api/coupang/deeplink", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-coupang-access-key": accessKey, "x-coupang-secret-key": secretKey },
        body: JSON.stringify({ urls: [product.productUrl] }),
      });
      if (res.ok) { const data = await res.json(); setGeneratedLink(data.data?.[0]?.shortenUrl || data.data?.[0]?.landingUrl || ""); }
    } catch { /* ignore */ }
    finally { setGeneratingLink(false); }
  };

  const handleAddToPick = () => {
    if (!selectedProduct) return;
    onAddPick({
      source_type: "coupang", name: selectedProduct.productName, price: selectedProduct.productPrice,
      category: selectedProduct.categoryName || "", image: selectedProduct.productImage || null,
      external_url: generatedLink || selectedProduct.productUrl,
      affiliate_code: generatedLink ? "coupang_partners" : null,
      source_meta: { name: selectedProduct.productName, price: selectedProduct.productPrice, image: selectedProduct.productImage || null, category: selectedProduct.categoryName, commission_rate: 3, product_url: selectedProduct.productUrl, affiliate_link: generatedLink, is_rocket: selectedProduct.isRocket },
    });
    setSelectedProduct(null); setGeneratedLink("");
    setToastMessage("PICK에 추가되었습니다!"); setTimeout(() => setToastMessage(""), 3000);
  };

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "rank": return a.rank - b.rank;
      case "price_low": return a.productPrice - b.productPrice;
      case "price_high": return b.productPrice - a.productPrice;
      default: return 0;
    }
  });

  const coupangPicks = picks.filter((p) => p.source_type === "coupang");

  return (
    <div className="space-y-6">
      {toastMessage && <div className="fixed top-6 right-6 z-50 rounded-lg bg-green-600 px-5 py-3 text-sm text-white shadow-lg">{toastMessage}</div>}

      {/* 온보딩 모달 (인팍 스타일 3단계) */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <button onClick={() => setShowOnboarding(false)} className="absolute right-4 top-4 z-10 cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316] text-sm font-bold text-white">{onboardingStep + 1}</div>
              {onboardingStep === 0 && (<><p className="text-xs text-gray-500">파트너스 탭 사용법</p><h3 className="mt-1 text-lg font-bold text-gray-900">홍보하고 싶은 쿠팡<br />상품을 검색해요</h3><p className="mt-2 text-xs text-gray-400">*최초 연동 1회 필요</p></>)}
              {onboardingStep === 1 && (<><p className="text-xs text-gray-500">파트너스 탭 사용법</p><h3 className="mt-1 text-lg font-bold text-gray-900">원하는 상품의 파트너스<br />링크를 생성해요</h3></>)}
              {onboardingStep === 2 && (<><p className="text-xs text-gray-500">파트너스 탭 사용법</p><h3 className="mt-1 text-lg font-bold text-gray-900">생성한 링크를 내 PICK에<br />바로 추가해요</h3></>)}
            </div>
            <div className="pb-6 text-center">
              <div className="mb-4 flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (<button key={i} onClick={() => setOnboardingStep(i)} className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${onboardingStep === i ? "bg-gray-900" : "bg-gray-300"}`} />))}
              </div>
              {onboardingStep < 2
                ? <button onClick={() => setOnboardingStep((s) => s + 1)} className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">다음</button>
                : <button onClick={() => setShowOnboarding(false)} className="cursor-pointer rounded-lg bg-gray-900 px-8 py-2.5 text-sm font-medium text-white">닫기</button>}
            </div>
          </div>
        </div>
      )}

      {/* 연동 모달 */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-center text-base font-semibold text-gray-900">쿠팡 파트너스 연동</h3>
            <p className="mb-5 text-center text-sm text-gray-500">API 키를 입력해주세요</p>
            <div className="space-y-3">
              <input type="text" placeholder="Access Key" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
              <input type="password" placeholder="Secret Key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowConnectModal(false)} className="flex-1 cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">닫기</button>
              <button onClick={handleConnect} className="flex-1 cursor-pointer rounded-lg bg-[#C41E1E] py-2.5 text-sm font-medium text-white hover:bg-[#A01818]">연동하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 링크 생성 모달 */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <button onClick={() => { setSelectedProduct(null); setGeneratedLink(""); }} className="absolute right-4 top-4 cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-6">
              <div className="mb-4 rounded-xl border border-gray-200 p-4">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {selectedProduct.productImage ? <img src={selectedProduct.productImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300">{IMAGE_PLACEHOLDER}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">상품 정보</p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium text-gray-900">{selectedProduct.productName}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(selectedProduct.productPrice)}</p>
                  </div>
                </div>
              </div>
              {generatingLink ? (
                <div className="flex items-center justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" /><span className="ml-2 text-sm text-gray-500">링크 생성 중...</span></div>
              ) : generatedLink ? (
                <>
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5">
                    <span className="text-green-500"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></span>
                    <span className="text-xs font-medium text-green-700">파트너스 링크 생성 완료</span>
                  </div>
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="flex-1 truncate text-xs text-gray-500">{generatedLink}</span>
                    <button onClick={() => { navigator.clipboard.writeText(generatedLink); setToastMessage("복사됨!"); setTimeout(() => setToastMessage(""), 2000); }} className="cursor-pointer shrink-0 text-xs font-medium text-[#C41E1E] hover:underline">복사</button>
                  </div>
                  <div className="space-y-2">
                    <button onClick={handleAddToPick} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818]">PICK에 바로 추가하기</button>
                    <button onClick={() => { setSelectedProduct(null); setGeneratedLink(""); }} className="w-full cursor-pointer rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">확인</button>
                  </div>
                </>
              ) : (
                <button onClick={() => handleGenerateLink(selectedProduct)} className="w-full cursor-pointer rounded-lg bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818]">링크 생성</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 검색 영역 */}
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">상품 찾기</h3>
            {isConnected && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">연동됨</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setOnboardingStep(0); setShowOnboarding(true); }} className="cursor-pointer flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              파트너스 사용법
            </button>
            {!isConnected && <button onClick={() => setShowConnectModal(true)} className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]">연동하기</button>}
          </div>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="쿠팡 상품명으로 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { isConnected ? handleSearch() : setShowConnectModal(true); } }}
            className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-20 text-sm outline-none focus:border-[#C41E1E]" />
          <button onClick={() => { isConnected ? handleSearch() : setShowConnectModal(true); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg bg-[#C41E1E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]">검색</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${selectedCat === cat ? "border border-[#C41E1E] bg-[#fff0f0] text-[#C41E1E]" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* 미연동 안내 */}
      {!isConnected && !hasSearched && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </div>
          <h4 className="mb-1 text-base font-semibold text-gray-900">쿠팡 파트너스를 연동하세요</h4>
          <p className="mb-5 text-sm text-gray-500">연동하면 쿠팡 상품을 검색하고<br />파트너스 링크를 생성할 수 있어요</p>
          <button onClick={() => setShowConnectModal(true)} className="cursor-pointer rounded-lg bg-[#C41E1E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#A01818]">연동하기</button>
        </div>
      )}

      {/* 연동됨 + 검색 전 */}
      {isConnected && !hasSearched && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <p className="text-sm text-gray-500">상품을 검색해서 파트너스 링크를 만들어 보세요</p>
        </div>
      )}

      {searching && (
        <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" /><span className="ml-3 text-sm text-gray-500">검색 중...</span></div>
      )}

      {/* 검색 결과 그리드 */}
      {!searching && hasSearched && results.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">상품 추천 <span className="text-gray-400">· {results.length}개</span></h4>
            <div className="flex gap-1.5">
              {([{ key: "rank" as const, label: "판매 랭킹" }, { key: "price_low" as const, label: "낮은가격" }, { key: "price_high" as const, label: "높은가격" }]).map((sort) => (
                <button key={sort.key} onClick={() => setSortBy(sort.key)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors ${sortBy === sort.key ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{sort.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedResults.map((product, idx) => {
              const isPicked = coupangPicks.some((p) => (p.source_meta?.product_url as string)?.includes(String(product.productId)));
              return (
                <div key={product.productId || idx} className={`overflow-hidden rounded-xl border transition-colors ${isPicked ? "border-[#C41E1E]" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="relative aspect-square bg-gray-100">
                    {product.productImage ? <img src={product.productImage} alt={product.productName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300">{IMAGE_PLACEHOLDER}</div>}
                    {product.rank > 0 && <span className="absolute left-2 top-2 flex h-6 min-w-[24px] items-center justify-center rounded-md bg-[#111111] px-1.5 text-xs font-bold text-white">{product.rank}</span>}
                    {product.isRocket && <span className="absolute right-2 top-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white">로켓</span>}
                    {isPicked && <span className="absolute right-2 bottom-2 rounded bg-[#C41E1E] px-2 py-0.5 text-xs font-medium text-white">PICK</span>}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">{product.productName}</p>
                    <p className="mt-1.5 text-base font-bold text-gray-900">{formatPrice(product.productPrice)}</p>
                    {product.categoryName && <p className="mt-0.5 text-xs text-gray-400">{product.categoryName}</p>}
                    <button onClick={() => !isPicked && handleGenerateLink(product)} disabled={isPicked}
                      className={`mt-3 w-full cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors ${isPicked ? "bg-gray-100 text-gray-400 cursor-default" : "bg-[#C41E1E] text-white hover:bg-[#A01818]"}`}>
                      {isPicked ? "PICK 완료" : "링크 생성"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center"><p className="text-sm text-gray-500">검색 결과가 없습니다. 다른 키워드로 검색해보세요.</p></div>
      )}

      {/* 이미 PICK된 쿠팡 상품 */}
      {coupangPicks.length > 0 && (
        <div className="border-t border-gray-200 pt-5">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">내 쿠팡 PICK <span className="text-[#C41E1E]">{coupangPicks.length}</span></h4>
          <div className="space-y-2">
            {coupangPicks.map((pick) => (
              <div key={pick.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {pick.image ? <img src={pick.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{pick.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400"><span>{formatPrice(pick.price)}</span><span>·</span><span>수수료 3%</span><span>·</span><span>클릭 {pick.clicks}</span></div>
                </div>
                <button onClick={() => onToggleVisible(pick.id)} className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium ${pick.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{pick.visible ? "노출" : "숨김"}</button>
                <button onClick={() => onRemovePick(pick.id)} className="cursor-pointer text-gray-400 hover:text-red-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 직접 상품 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OwnProductTab({
  picks, onAddPick, onRemovePick, onToggleVisible, onEditComment,
}: {
  picks: PickItem[]; onAddPick: (partial: Partial<PickItem>) => void; onRemovePick: (id: string) => void; onToggleVisible: (id: string) => void; onEditComment: (id: string, comment: string) => void;
}) {
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [url, setUrl] = useState(""); const [name, setName] = useState(""); const [price, setPrice] = useState("");
  const [category, setCategory] = useState(""); const [imageUrl, setImageUrl] = useState(""); const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null); const [commentDraft, setCommentDraft] = useState("");
  const OWN_CATEGORIES = ["패션/의류", "뷰티/화장품", "식품", "생활용품", "디지털/가전", "굿즈/MD", "핸드메이드", "기타"];

  const resetForm = () => { setUrl(""); setName(""); setPrice(""); setCategory(""); setImageUrl(""); setComment(""); };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAddPick({
      source_type: "own", name: name.trim(), price: parseInt(price) || 0, category: category || "기타",
      image: imageUrl.trim() || null, external_url: url.trim() || null, curation_comment: comment.trim(),
      source_meta: { name: name.trim(), price: parseInt(price) || 0, image: imageUrl.trim() || null, category: category || "기타", custom_price: parseInt(price) || 0 },
    });
    resetForm();
  };

  const ownPicks = picks.filter((p) => p.source_type === "own");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-5">
        <h3 className="text-base font-semibold text-gray-900">내 상품 등록</h3>
        <p className="mt-1 text-sm text-gray-500">자체 제작 굿즈, 핸드메이드, 자사몰 상품 등을 직접 등록해서 팬들에게 공유하세요.</p>
      </div>

      {/* 등록 방식 */}
      <div className="flex gap-2">
        <button onClick={() => setMode("url")} className={`cursor-pointer flex-1 rounded-xl border-2 p-4 text-left transition-colors ${mode === "url" ? "border-[#C41E1E] bg-[#fff5f5]" : "border-gray-200 hover:border-gray-300"}`}>
          <svg className="mb-1 h-6 w-6 text-[#C41E1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          <p className="text-sm font-medium text-gray-900">URL로 등록</p><p className="mt-0.5 text-xs text-gray-500">자사몰, 스마트스토어 등 판매 링크</p>
        </button>
        <button onClick={() => setMode("manual")} className={`cursor-pointer flex-1 rounded-xl border-2 p-4 text-left transition-colors ${mode === "manual" ? "border-[#C41E1E] bg-[#fff5f5]" : "border-gray-200 hover:border-gray-300"}`}>
          <svg className="mb-1 h-6 w-6 text-[#C41E1E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          <p className="text-sm font-medium text-gray-900">직접 입력</p><p className="mt-0.5 text-xs text-gray-500">상품 정보를 수동으로 입력</p>
        </button>
      </div>

      {/* 입력 폼 */}
      <div className="rounded-xl border border-gray-200 p-5 space-y-4">
        {mode === "url" && (
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">판매 링크 *</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://smartstore.naver.com/myshop/products/..." className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" /></div>
        )}
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">상품명 *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="상품명을 입력하세요" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">가격</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-gray-700">카테고리</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E] bg-white">
              <option value="">선택하세요</option>
              {OWN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></div>
        </div>
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">상품 이미지 URL</label>
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" /></div>
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">큐레이션 코멘트</label>
          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="이 상품을 추천하는 이유를 한 줄로" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#C41E1E]" /></div>
        <div className="flex justify-end pt-1">
          <button onClick={handleSubmit} disabled={!name.trim()} className="cursor-pointer rounded-lg bg-[#C41E1E] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#A01818] disabled:opacity-40 disabled:cursor-default">PICK 추가</button>
        </div>
      </div>

      {/* 등록된 내 상품 */}
      {ownPicks.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">내 직접 상품 <span className="text-[#C41E1E]">{ownPicks.length}</span></h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ownPicks.map((pick) => (
              <div key={pick.id} className={`overflow-hidden rounded-xl border transition-colors ${pick.visible ? "border-gray-200" : "border-gray-200 opacity-60"}`}>
                <div className="relative aspect-square bg-gray-100">
                  {pick.image ? <img src={pick.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300">{IMAGE_PLACEHOLDER}</div>}
                  <span className="absolute left-2 top-2 rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-medium text-white">직접</span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">{pick.name}</p>
                  {pick.price > 0 && <p className="mt-1 text-base font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>}
                  <div className="mt-1.5 flex gap-3 text-[11px] text-gray-500">
                    <span>클릭 <b className="text-gray-900">{pick.clicks}</b></span><span>전환 <b className="text-gray-900">{pick.conversions}</b></span>
                  </div>
                  {editingId === pick.id ? (
                    <div className="mt-2 flex gap-1.5">
                      <input type="text" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="코멘트"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-[11px] outline-none focus:border-[#C41E1E]"
                        onKeyDown={(e) => { if (e.key === "Enter") { onEditComment(pick.id, commentDraft); setEditingId(null); } }} />
                      <button onClick={() => { onEditComment(pick.id, commentDraft); setEditingId(null); }} className="cursor-pointer rounded bg-[#C41E1E] px-2 py-1 text-[10px] text-white">저장</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingId(pick.id); setCommentDraft(pick.curation_comment); }}
                      className="mt-2 block w-full text-left text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer">
                      {pick.curation_comment ? <span className="italic">&ldquo;{pick.curation_comment}&rdquo;</span> : <span className="text-gray-400">+ 코멘트 추가</span>}
                    </button>
                  )}
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => onToggleVisible(pick.id)} className={`flex-1 cursor-pointer rounded py-1.5 text-[11px] font-medium ${pick.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{pick.visible ? "노출" : "숨김"}</button>
                    <button onClick={() => onRemovePick(pick.id)} className="flex-1 cursor-pointer rounded border border-gray-200 py-1.5 text-[11px] font-medium text-gray-400 hover:text-red-500">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 전체 보기 (리스트 뷰)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AllPicksList({
  picks, onToggleVisible, onRemovePick, onEditComment, onMoveUp, onMoveDown,
}: {
  picks: PickItem[]; onToggleVisible: (id: string) => void; onRemovePick: (id: string) => void; onEditComment: (id: string, comment: string) => void; onMoveUp: (id: string) => void; onMoveDown: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  if (picks.length === 0) {
    return (<div className="flex flex-col items-center py-16 text-center"><p className="text-sm font-medium text-gray-900">아직 PICK이 없습니다</p><p className="mt-1 text-xs text-gray-500">각 탭에서 상품을 추가해보세요</p></div>);
  }

  return (
    <div className="space-y-3">
      {picks.map((pick, idx) => (
        <div key={pick.id} className={`rounded-xl border p-4 transition-colors ${pick.visible ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-60"}`}>
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {pick.image ? <img src={pick.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-300"><svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceBadgeStyle(pick.source_type)}`}>{sourceLabel(pick.source_type)}</span>
                {pick.category && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{pick.category}</span>}
                {pick.external_url && <a href={pick.external_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-[#C41E1E]">링크 →</a>}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-gray-900 leading-snug">{pick.name}</h3>
              {pick.price > 0 && <p className="mt-0.5 text-sm font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>}
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span>클릭 <span className="font-medium text-gray-900">{pick.clicks}</span></span>
                <span>전환 <span className="font-medium text-gray-900">{pick.conversions}</span></span>
                {pick.revenue > 0 && <span>수익 <span className="font-medium text-[#C41E1E]">{formatPrice(pick.revenue)}</span></span>}
              </div>
              {editingId === pick.id ? (
                <div className="mt-2 flex gap-2">
                  <input type="text" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="큐레이션 코멘트 입력"
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-[#C41E1E]"
                    onKeyDown={(e) => { if (e.key === "Enter") { onEditComment(pick.id, commentDraft); setEditingId(null); } }} />
                  <button onClick={() => { onEditComment(pick.id, commentDraft); setEditingId(null); }} className="cursor-pointer rounded bg-[#C41E1E] px-3 py-1 text-xs font-medium text-white hover:bg-[#A01818]">저장</button>
                </div>
              ) : (
                <button onClick={() => { setEditingId(pick.id); setCommentDraft(pick.curation_comment); }} className="mt-2 block text-left text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
                  {pick.curation_comment ? <span className="italic">&ldquo;{pick.curation_comment}&rdquo;</span> : <span className="text-gray-400">+ 큐레이션 코멘트 추가</span>}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1">
                <button onClick={() => onMoveUp(pick.id)} disabled={idx === 0} className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={() => onMoveDown(pick.id)} disabled={idx === picks.length - 1} className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <button onClick={() => onToggleVisible(pick.id)} className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium ${pick.visible ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{pick.visible ? "노출" : "숨김"}</button>
              <button onClick={() => onRemovePick(pick.id)} className="cursor-pointer rounded px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-red-500">삭제</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MyPicks() {
  const [picks, setPicks] = useState<PickItem[]>(FALLBACK_PICKS);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isDbConnected, setIsDbConnected] = useState(false);

  const loadPicks = useCallback(async () => {
    try {
      const res = await fetch("/api/picks");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length >= 0) {
          setIsDbConnected(true);
          if (data.length > 0) {
            const mapped: PickItem[] = data.map((d: Record<string, unknown>) => ({
              id: d.id as string, source_type: (d.source_type as SourceType) || "tubeping_campaign",
              product_id: d.product_id as string | null, external_url: d.external_url as string | null,
              affiliate_code: d.affiliate_code as string | null, source_meta: (d.source_meta as Record<string, unknown>) || {},
              display_order: (d.display_order as number) || 0, visible: d.visible !== false,
              curation_comment: (d.curation_comment as string) || "", clicks: (d.clicks as number) || 0, conversions: (d.conversions as number) || 0,
              name: ((d.source_meta as Record<string, unknown>)?.name as string) || ((d as Record<string, unknown> & { products?: { product_name?: string } }).products?.product_name) || "상품명 없음",
              category: (d.source_meta as Record<string, unknown>)?.category as string || "",
              price: (d.source_meta as Record<string, unknown>)?.price as number || 0,
              image: (d.source_meta as Record<string, unknown>)?.image as string | null || null, revenue: 0,
            }));
            setPicks(mapped);
          }
        }
      }
    } catch { /* fallback */ }
  }, []);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  const apiPatch = async (id: string, updates: Record<string, unknown>) => {
    if (!isDbConnected) return;
    await fetch("/api/picks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
  };

  const toggleVisible = (id: string) => {
    setPicks((prev) => prev.map((p) => { if (p.id !== id) return p; const next = { ...p, visible: !p.visible }; apiPatch(id, { visible: next.visible }); return next; }));
  };

  const moveUp = (id: string) => {
    setPicks((prev) => { const idx = prev.findIndex((p) => p.id === id); if (idx <= 0) return prev; const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; apiPatch(next[idx - 1].id, { display_order: idx - 1 }); apiPatch(next[idx].id, { display_order: idx }); return next; });
  };

  const moveDown = (id: string) => {
    setPicks((prev) => { const idx = prev.findIndex((p) => p.id === id); if (idx === -1 || idx >= prev.length - 1) return prev; const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; apiPatch(next[idx].id, { display_order: idx }); apiPatch(next[idx + 1].id, { display_order: idx + 1 }); return next; });
  };

  const editComment = (id: string, comment: string) => {
    setPicks((prev) => prev.map((p) => (p.id === id ? { ...p, curation_comment: comment } : p)));
    apiPatch(id, { curation_comment: comment });
  };

  const removePick = async (id: string) => {
    setPicks((prev) => prev.filter((p) => p.id !== id));
    if (isDbConnected) await fetch(`/api/picks?id=${id}`, { method: "DELETE" });
  };

  const addPick = async (partial: Partial<PickItem>) => {
    const newPick: PickItem = {
      id: "temp-" + Date.now(), source_type: partial.source_type || "own", product_id: null,
      external_url: partial.external_url || null, affiliate_code: partial.affiliate_code || null,
      source_meta: { ...(partial.source_meta || {}), name: partial.name, category: partial.category, price: partial.price, image: partial.image },
      display_order: picks.length, visible: true, curation_comment: partial.curation_comment || "",
      clicks: 0, conversions: 0, name: partial.name || "", category: partial.category || "", price: partial.price || 0, image: partial.image || null, revenue: 0,
    };
    setPicks((prev) => [...prev, newPick]);
    if (isDbConnected) {
      try {
        const res = await fetch("/api/picks", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_type: newPick.source_type, external_url: newPick.external_url, affiliate_code: newPick.affiliate_code, curation_comment: newPick.curation_comment, source_meta: newPick.source_meta }) });
        if (res.ok) { const saved = await res.json(); setPicks((prev) => prev.map((p) => (p.id === newPick.id ? { ...newPick, id: saved.id } : p))); }
      } catch { /* local fallback */ }
    }
  };

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "전체", count: picks.length },
    { key: "tubeping_campaign", label: "공구", count: picks.filter((p) => p.source_type === "tubeping_campaign").length },
    { key: "coupang", label: "쿠팡", count: picks.filter((p) => p.source_type === "coupang").length },
    { key: "naver", label: "네이버", count: picks.filter((p) => p.source_type === "naver").length },
    { key: "own", label: "직접", count: picks.filter((p) => p.source_type === "own").length },
  ];

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">내 PICK</h2>
        <p className="mt-1 text-sm text-gray-500">
          여러 소스에서 모은 추천 상품의 큐레이션 아카이브
          {!isDbConnected && <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">더미 데이터</span>}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-100 pb-4">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${filter === f.key ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filter === "all" && <AllPicksList picks={picks} onToggleVisible={toggleVisible} onRemovePick={removePick} onEditComment={editComment} onMoveUp={moveUp} onMoveDown={moveDown} />}
      {filter === "tubeping_campaign" && <GongguTab picks={picks} onAddPick={addPick} onRemovePick={removePick} onToggleVisible={toggleVisible} onEditComment={editComment} />}
      {filter === "coupang" && <CoupangTab picks={picks} onAddPick={addPick} onRemovePick={removePick} onToggleVisible={toggleVisible} />}
      {filter === "naver" && <AllPicksList picks={picks.filter((p) => p.source_type === "naver")} onToggleVisible={toggleVisible} onRemovePick={removePick} onEditComment={editComment} onMoveUp={moveUp} onMoveDown={moveDown} />}
      {filter === "own" && <OwnProductTab picks={picks} onAddPick={addPick} onRemovePick={removePick} onToggleVisible={toggleVisible} onEditComment={editComment} />}
    </div>
  );
}

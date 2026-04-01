"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

/* ───────── 더미 상품 데이터 ───────── */
const DUMMY_PRODUCTS = [
  { name: "에코백 A", price: 29000, margin: 35 },
  { name: "머그컵 B", price: 18000, margin: 42 },
  { name: "노트 C", price: 12000, margin: 50 },
  { name: "텀블러 D", price: 35000, margin: 38 },
  { name: "파우치 E", price: 15000, margin: 45 },
  { name: "키링 F", price: 9000, margin: 60 },
] as const;

/* ───────── 타입 ───────── */
type Tab = "profile" | "styling" | "block" | "settings";
type LayoutOption = "default" | "side" | "top" | "bottom";
type Alignment = "left" | "center";
type FontSize = "small" | "normal" | "large";
type Theme = "default" | "light" | "red" | "dark" | "green" | "custom";
type BgMode = "solid" | "image";
type FontFamily = "pretendard" | "nanumgothic" | "kakaobigsans" | "handorigothic" | "maruburi" | "unnigraphie";
type BannerType = "image" | "notice";
type CardShape = "sharp" | "normal" | "round";
type Shadow = "none" | "light" | "medium" | "strong";
type Animation = "none" | "slide" | "bounce";
type LogoMode = "default" | "upload" | "hidden";
type AddressType = "default" | "short" | "custom";

interface BannerItem {
  id: string;
  type: BannerType;
  image?: string;
  title: string;
  link?: string;
  bgColor?: string;
}

/* ───────── 아이콘 SVG ───────── */
const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#9ca3af"} strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
  </svg>
);
const StylingIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#9ca3af"} strokeWidth="2">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
  </svg>
);
const BlockIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#9ca3af"} strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const SettingsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#9ca3af"} strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/* ───────── SNS 아이콘 ───────── */
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
const YoutubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

/* ───────── 메인 컴포넌트 ───────── */
export default function ShopCustomize() {
  /* ── 공통 ── */
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [toast, setToast] = useState(false);

  /* ── 프로필 ── */
  const [layout, setLayout] = useState<LayoutOption>("default");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [shopName, setShopName] = useState("내 쇼핑몰");
  const [bio, setBio] = useState("");
  const [snsLinks, setSnsLinks] = useState<string[]>(["instagram", "youtube"]);
  const [alignment, setAlignment] = useState<Alignment>("left");
  const [fontSize, setFontSize] = useState<FontSize>("normal");

  /* ── 스타일링 ── */
  const [theme, setTheme] = useState<Theme>("default");
  const [bgMode, setBgMode] = useState<BgMode>("solid");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<FontFamily>("pretendard");

  /* ── 블록 ── */
  const [banners, setBanners] = useState<BannerItem[]>([
    { id: "b1", type: "image", title: "봄 신상 할인", link: "" },
    { id: "b2", type: "notice", title: "무료배송 이벤트 진행 중!", bgColor: "#C41E1E" },
  ]);
  const [cardShape, setCardShape] = useState<CardShape>("normal");
  const [shadow, setShadow] = useState<Shadow>("light");
  const [animation, setAnimation] = useState<Animation>("none");

  /* ── 설정 ── */
  const [logoMode, setLogoMode] = useState<LogoMode>("default");
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [notice, setNotice] = useState("오늘만 전 상품 10% 할인!");
  const [noticeTextColor, setNoticeTextColor] = useState("#ffffff");
  const [noticeBgColor, setNoticeBgColor] = useState("#C41E1E");
  const [bizProposal, setBizProposal] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [addressType, setAddressType] = useState<AddressType>("default");
  const [slug, setSlug] = useState("myshop");
  const [customDomain, setCustomDomain] = useState("");
  const [dnsOpen, setDnsOpen] = useState(false);
  const [domainChecking, setDomainChecking] = useState(false);

  /* ── 배너 슬라이드 (미리보기) ── */
  const [bannerIdx, setBannerIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length]);

  /* ── 저장 토스트 ── */
  const handleSave = useCallback(() => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }, []);

  /* ── 파일 업로드 헬퍼 ── */
  const handleFileSelect = (cb: (url: string) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) cb(URL.createObjectURL(file));
    };
    input.click();
  };

  /* ── 배너 조작 ── */
  const addBanner = () => {
    if (banners.length >= 5) return;
    setBanners((prev) => [
      ...prev,
      { id: `b${Date.now()}`, type: "image", title: "", link: "" },
    ]);
  };
  const removeBanner = (id: string) => setBanners((prev) => prev.filter((b) => b.id !== id));
  const moveBanner = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= banners.length) return;
    const arr = [...banners];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setBanners(arr);
  };
  const updateBanner = (id: string, patch: Partial<BannerItem>) =>
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  /* ── 테마 프리셋 ── */
  const themeColors: Record<Theme, { bg: string; text: string }> = {
    default: { bg: "#ffffff", text: "#111827" },
    light: { bg: "#f9fafb", text: "#374151" },
    red: { bg: "#fef2f2", text: "#991b1b" },
    dark: { bg: "#1f2937", text: "#f9fafb" },
    green: { bg: "#f0fdf4", text: "#166534" },
    custom: { bg: bgColor, text: "#111827" },
  };

  /* ── 폰트 매핑 ── */
  const fontMap: Record<FontFamily, string> = {
    pretendard: "'Pretendard', sans-serif",
    nanumgothic: "'Nanum Gothic', sans-serif",
    kakaobigsans: "'KakaoBigSans', sans-serif",
    handorigothic: "'Handori Gothic', sans-serif",
    maruburi: "'MaruBuri', serif",
    unnigraphie: "'UNnigraphie', sans-serif",
  };
  const fontLabel: Record<FontFamily, string> = {
    pretendard: "프리텐다드",
    nanumgothic: "나눔고딕",
    kakaobigsans: "카카오빅산스",
    handorigothic: "한도리고딕",
    maruburi: "마루부리",
    unnigraphie: "어니그라피",
  };

  /* ── 미리보기 카드 모양 ── */
  const shapeClass: Record<CardShape, string> = {
    sharp: "rounded-none",
    normal: "rounded-md",
    round: "rounded-2xl",
  };
  const shadowClass: Record<Shadow, string> = {
    none: "",
    light: "shadow-sm",
    medium: "shadow-md",
    strong: "shadow-xl",
  };
  const fontSizeClass: Record<FontSize, string> = {
    small: "text-xs",
    normal: "text-sm",
    large: "text-base",
  };

  /* ── 색상 팔레트 ── */
  const bgPalette = ["#ffffff", "#f3f4f6", "#fef2f2", "#f0fdf4", "#eff6ff", "#fdf4ff"];
  const textPalette = ["#ffffff", "#111827", "#C41E1E", "#166534", "#1e40af", "#7c3aed"];
  const noticeBgPalette = ["#C41E1E", "#111827", "#1e40af", "#166534", "#7c3aed"];
  const bannerBgPalette = ["#C41E1E", "#111827", "#1e40af"];

  /* ════════════════════════════════════════
     렌더
  ════════════════════════════════════════ */
  return (
    <div className="flex h-screen bg-white text-gray-900 select-none overflow-hidden">
      {/* ══════ 탭바 (54px) ══════ */}
      <div className="flex flex-col items-center w-[54px] min-w-[54px] border-r border-gray-200 py-4 gap-2">
        {(
          [
            ["profile", ProfileIcon],
            ["styling", StylingIcon],
            ["block", BlockIcon],
            ["settings", SettingsIcon],
          ] as [Tab, React.FC<{ active: boolean }>][]
        ).map(([tab, Icon]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
              activeTab === tab ? "bg-[#C41E1E]" : "bg-white hover:bg-gray-100"
            }`}
          >
            <Icon active={activeTab === tab} />
          </button>
        ))}
      </div>

      {/* ══════ 설정 패널 (260px) ══════ */}
      <div className="w-[260px] min-w-[260px] border-r border-gray-200 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* ── 탭 1: 프로필 ── */}
          {activeTab === "profile" && (
            <>
              <h3 className="font-semibold text-sm">프로필</h3>

              {/* 레이아웃 선택 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">레이아웃</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["default", "side", "top", "bottom"] as LayoutOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setLayout(opt)}
                      className={`border rounded-lg p-2 text-xs text-center transition-colors ${
                        layout === opt
                          ? "border-[#C41E1E] bg-red-50 text-[#C41E1E]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {{ default: "기본", side: "옆", top: "위", bottom: "아래" }[opt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 커버 이미지 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">커버 이미지</label>
                <div
                  onClick={() => handleFileSelect(setCoverImage)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) setCoverImage(URL.createObjectURL(file));
                  }}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-xs text-gray-400 cursor-pointer hover:border-[#C41E1E] transition-colors"
                >
                  {coverImage ? (
                    <img src={coverImage} alt="cover" className="w-full h-20 object-cover rounded" />
                  ) : (
                    "이미지를 드래그하거나 클릭하세요"
                  )}
                </div>
              </div>

              {/* 쇼핑몰명 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">쇼핑몰명</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C41E1E]"
                />
              </div>

              {/* 소개글 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">소개글</label>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 100) setBio(e.target.value);
                  }}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C41E1E]"
                />
                <p className="text-right text-xs text-gray-400">{bio.length}/100</p>
              </div>

              {/* SNS 링크 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">SNS 링크</label>
                <div className="flex gap-2 items-center flex-wrap">
                  {snsLinks.map((sns, i) => (
                    <button
                      key={i}
                      className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:border-[#C41E1E] hover:text-[#C41E1E] transition-colors"
                    >
                      {sns === "instagram" ? <InstagramIcon /> : <YoutubeIcon />}
                    </button>
                  ))}
                  <button
                    onClick={() => setSnsLinks((prev) => [...prev, "instagram"])}
                    className="w-9 h-9 flex items-center justify-center border border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-[#C41E1E] hover:text-[#C41E1E] transition-colors text-lg"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 정렬 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">정렬</label>
                <div className="flex gap-2">
                  {(["left", "center"] as Alignment[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAlignment(a)}
                      className={`flex-1 border rounded-lg py-2 text-xs transition-colors ${
                        alignment === a
                          ? "border-[#C41E1E] bg-red-50 text-[#C41E1E]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {a === "left" ? "왼쪽" : "가운데"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 글꼴 크기 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">글꼴 크기</label>
                <div className="flex gap-2">
                  {(["small", "normal", "large"] as FontSize[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFontSize(s)}
                      className={`flex-1 border rounded-lg py-2 text-xs transition-colors ${
                        fontSize === s
                          ? "border-[#C41E1E] bg-red-50 text-[#C41E1E]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {{ small: "작게", normal: "보통", large: "크게" }[s]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 탭 2: 스타일링 ── */}
          {activeTab === "styling" && (
            <>
              <h3 className="font-semibold text-sm">스타일링</h3>

              {/* 테마 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">테마</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["default", "light", "red", "dark", "green", "custom"] as Theme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTheme(t);
                        if (t !== "custom") setBgColor(themeColors[t].bg);
                      }}
                      className={`border rounded-lg p-2 text-xs text-center transition-colors ${
                        theme === t
                          ? "border-[#C41E1E] bg-red-50 text-[#C41E1E]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full mx-auto mb-1 border border-gray-200"
                        style={{ backgroundColor: themeColors[t].bg }}
                      />
                      {{ default: "기본", light: "라이트", red: "레드", dark: "다크", green: "그린", custom: "직접설정" }[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 배경 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">배경</label>
                <div className="flex gap-1 mb-2">
                  {(["solid", "image"] as BgMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setBgMode(m)}
                      className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                        bgMode === m
                          ? "bg-[#C41E1E] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {m === "solid" ? "단색" : "이미지"}
                    </button>
                  ))}
                </div>
                {bgMode === "solid" ? (
                  <div className="flex gap-2 flex-wrap">
                    {bgPalette.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setBgColor(c);
                          setTheme("custom");
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-colors ${
                          bgColor === c ? "border-[#C41E1E]" : "border-gray-200"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => handleFileSelect(setBgImage)}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center text-xs text-gray-400 cursor-pointer hover:border-[#C41E1E] transition-colors"
                  >
                    {bgImage ? "이미지 업로드됨 ✓" : "배경 이미지 업로드"}
                  </div>
                )}
              </div>

              {/* 폰트 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">폰트</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(fontLabel) as FontFamily[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFontFamily(f)}
                      className={`border rounded-lg py-2 text-xs transition-colors ${
                        fontFamily === f
                          ? "border-[#C41E1E] bg-red-50 text-[#C41E1E]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {fontLabel[f]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 탭 3: 블록 ── */}
          {activeTab === "block" && (
            <>
              <h3 className="font-semibold text-sm">블록</h3>

              {/* 배너 목록 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">배너 슬라이드</label>
                <div className="space-y-3">
                  {banners.map((banner, idx) => (
                    <div key={banner.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      {/* 타입 전환 */}
                      <div className="flex gap-1">
                        {(["image", "notice"] as BannerType[]).map((bt) => (
                          <button
                            key={bt}
                            onClick={() => updateBanner(banner.id, { type: bt })}
                            className={`flex-1 text-xs py-1 rounded transition-colors ${
                              banner.type === bt
                                ? "bg-[#C41E1E] text-white"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {bt === "image" ? "이미지형" : "공지형"}
                          </button>
                        ))}
                      </div>

                      {banner.type === "image" ? (
                        <>
                          <div
                            onClick={() =>
                              handleFileSelect((url) => updateBanner(banner.id, { image: url }))
                            }
                            className="border border-dashed border-gray-300 rounded p-2 text-xs text-gray-400 text-center cursor-pointer hover:border-[#C41E1E] transition-colors"
                          >
                            {banner.image ? "이미지 업로드됨 ✓" : "이미지 업로드"}
                          </div>
                          <input
                            type="text"
                            placeholder="제목"
                            value={banner.title}
                            onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#C41E1E]"
                          />
                          <input
                            type="text"
                            placeholder="링크 URL"
                            value={banner.link || ""}
                            onChange={(e) => updateBanner(banner.id, { link: e.target.value })}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#C41E1E]"
                          />
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            placeholder="공지 텍스트"
                            value={banner.title}
                            onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#C41E1E]"
                          />
                          <div className="flex gap-2">
                            {bannerBgPalette.map((c) => (
                              <button
                                key={c}
                                onClick={() => updateBanner(banner.id, { bgColor: c })}
                                className={`w-6 h-6 rounded-full border-2 transition-colors ${
                                  banner.bgColor === c ? "border-[#C41E1E]" : "border-gray-200"
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* 순서/삭제 */}
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => moveBanner(idx, -1)}
                          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-100"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveBanner(idx, 1)}
                          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-100"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeBanner(banner.id)}
                          className="w-7 h-7 flex items-center justify-center border border-red-200 rounded text-xs text-red-500 hover:bg-red-50"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {banners.length < 5 && (
                  <button
                    onClick={addBanner}
                    className="w-full mt-2 border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-500 hover:border-[#C41E1E] hover:text-[#C41E1E] transition-colors"
                  >
                    + 배너 추가
                  </button>
                )}
              </div>

              {/* 모양 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">모양</label>
                <div className="flex gap-2">
                  {(["sharp", "normal", "round"] as CardShape[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCardShape(s)}
                      className={`flex-1 border rounded-lg py-2 text-xs transition-colors ${
                        cardShape === s
                          ? "border-[#C41E1E] bg-red-50 text-[#C41E1E]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {{ sharp: "각진", normal: "보통", round: "둥근" }[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 그림자 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">그림자</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["none", "light", "medium", "strong"] as Shadow[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setShadow(s)}
                      className={`border rounded-lg py-2 text-xs transition-colors ${
                        shadow === s
                          ? "border-[#C41E1E] bg-red-50 text-[#C41E1E]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {{ none: "없음", light: "연하게", medium: "진하게", strong: "강하게" }[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 애니메이션 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">애니메이션</label>
                <div className="flex gap-2">
                  {(["none", "slide", "bounce"] as Animation[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAnimation(a)}
                      className={`flex-1 border rounded-lg py-2 text-xs transition-colors ${
                        animation === a
                          ? "border-[#C41E1E] bg-red-50 text-[#C41E1E]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {{ none: "없음", slide: "슬라이드", bounce: "바운스" }[a]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 탭 4: 설정 ── */}
          {activeTab === "settings" && (
            <>
              <h3 className="font-semibold text-sm">설정</h3>

              {/* 로고 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">로고</label>
                <div className="flex gap-1 mb-2">
                  {(["default", "upload", "hidden"] as LogoMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setLogoMode(m)}
                      className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                        logoMode === m
                          ? "bg-[#C41E1E] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {{ default: "기본", upload: "업로드", hidden: "숨기기" }[m]}
                    </button>
                  ))}
                </div>
                {logoMode === "upload" && (
                  <div
                    onClick={() => handleFileSelect(setLogoImage)}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center text-xs text-gray-400 cursor-pointer hover:border-[#C41E1E] transition-colors"
                  >
                    {logoImage ? "로고 업로드됨 ✓" : "로고 이미지 업로드"}
                  </div>
                )}
              </div>

              {/* 한줄 공지 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">한줄 공지</label>
                <input
                  type="text"
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C41E1E]"
                />
              </div>

              {/* 글씨색 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">글씨색</label>
                <div className="flex gap-2 flex-wrap">
                  {textPalette.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNoticeTextColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        noticeTextColor === c ? "border-[#C41E1E]" : "border-gray-200"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* 배경색 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">배경색</label>
                <div className="flex gap-2 flex-wrap">
                  {noticeBgPalette.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNoticeBgColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        noticeBgColor === c ? "border-[#C41E1E]" : "border-gray-200"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* 토글 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">비즈니스 제안</p>
                    <p className="text-[10px] text-gray-400">브랜드가 협업 제안할 수 있습니다</p>
                  </div>
                  <button
                    onClick={() => setBizProposal(!bizProposal)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      bizProposal ? "bg-[#C41E1E]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        bizProposal ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">상품 검색 기능</p>
                    <p className="text-[10px] text-gray-400">고객이 상품을 검색할 수 있습니다</p>
                  </div>
                  <button
                    onClick={() => setSearchEnabled(!searchEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      searchEnabled ? "bg-[#C41E1E]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        searchEnabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 주소 설정 */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">주소 설정</label>
                <div className="space-y-2">
                  {/* 기본주소 */}
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="address"
                      checked={addressType === "default"}
                      onChange={() => setAddressType("default")}
                      className="mt-0.5 accent-[#C41E1E]"
                    />
                    <div className="text-xs">
                      <p className="font-medium">기본주소</p>
                      <p className="text-gray-400">tubeping.com/store/{slug}</p>
                    </div>
                  </label>
                  {/* 단축주소 */}
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="address"
                      checked={addressType === "short"}
                      onChange={() => setAddressType("short")}
                      className="mt-0.5 accent-[#C41E1E]"
                    />
                    <div className="text-xs">
                      <p className="font-medium">단축주소</p>
                      <p className="text-gray-400">tpng.kr/{slug}</p>
                    </div>
                  </label>
                  {/* 커스텀 도메인 */}
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="address"
                      checked={addressType === "custom"}
                      onChange={() => setAddressType("custom")}
                      className="mt-0.5 accent-[#C41E1E]"
                    />
                    <div className="text-xs">
                      <p className="font-medium">커스텀 도메인</p>
                    </div>
                  </label>
                  {addressType === "custom" && (
                    <div className="ml-5 space-y-2">
                      <input
                        type="text"
                        placeholder="yourdomain.com"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#C41E1E]"
                      />
                      <button
                        onClick={() => setDnsOpen(!dnsOpen)}
                        className="text-xs text-[#C41E1E] hover:underline"
                      >
                        {dnsOpen ? "▾ DNS 안내 접기" : "▸ DNS 안내 펼치기"}
                      </button>
                      {dnsOpen && (
                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-2">
                          <p>CNAME 레코드를 store.tubeping.com 으로 설정하세요</p>
                          <button
                            onClick={() => navigator.clipboard.writeText("store.tubeping.com")}
                            className="text-[#C41E1E] hover:underline text-xs"
                          >
                            복사
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setDomainChecking(true);
                          setTimeout(() => setDomainChecking(false), 2000);
                        }}
                        disabled={domainChecking}
                        className="w-full border border-[#C41E1E] text-[#C41E1E] rounded-lg py-1.5 text-xs hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {domainChecking ? "확인 중..." : "연결 확인"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 저장 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={handleSave}
            className="w-full bg-[#C41E1E] hover:bg-[#A01818] text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            저장
          </button>
        </div>
      </div>

      {/* ══════ 미리보기 영역 ══════ */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center p-8 overflow-auto">
        {/* 모바일 프레임 */}
        <div className="w-[375px] h-[740px] bg-white rounded-[2.5rem] shadow-2xl border-[8px] border-gray-800 overflow-hidden flex flex-col relative">
          {/* 노치 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-10" />

          {/* 스크롤 컨테이너 */}
          <div
            className="flex-1 overflow-y-auto"
            style={{
              backgroundColor: bgMode === "solid" ? bgColor : themeColors[theme].bg,
              fontFamily: fontMap[fontFamily],
            }}
          >
            {/* 상단 패딩 (노치 공간) */}
            <div className="h-8" />

            {/* 1. 한줄 공지 */}
            {notice && (
              <div
                className="px-4 py-2 text-xs text-center"
                style={{ backgroundColor: noticeBgColor, color: noticeTextColor }}
              >
                {notice}
              </div>
            )}

            {/* 2. 로고 + 쇼핑몰명 헤더 */}
            <div
              className={`px-4 py-3 flex items-center gap-2 ${
                alignment === "center" ? "justify-center" : "justify-start"
              }`}
            >
              {logoMode !== "hidden" && (
                <div className="w-8 h-8 bg-[#C41E1E] rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {logoMode === "upload" && logoImage ? (
                    <img src={logoImage} alt="logo" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    "T"
                  )}
                </div>
              )}
              <span
                className={`font-semibold ${fontSizeClass[fontSize]}`}
                style={{ color: themeColors[theme].text }}
              >
                {shopName}
              </span>
            </div>

            {/* 커버 이미지 */}
            {coverImage && (
              <div className="px-4 mb-2">
                <img src={coverImage} alt="cover" className="w-full h-32 object-cover rounded-xl" />
              </div>
            )}

            {/* 3. 소개글 */}
            {bio && (
              <p
                className={`px-4 mb-3 text-xs text-gray-500 ${
                  alignment === "center" ? "text-center" : "text-left"
                }`}
              >
                {bio}
              </p>
            )}

            {/* SNS 아이콘 */}
            {snsLinks.length > 0 && (
              <div
                className={`px-4 mb-3 flex gap-2 ${
                  alignment === "center" ? "justify-center" : "justify-start"
                }`}
              >
                {snsLinks.map((sns, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
                  >
                    {sns === "instagram" ? <InstagramIcon /> : <YoutubeIcon />}
                  </div>
                ))}
              </div>
            )}

            {/* 4. 검색창 */}
            {searchEnabled && (
              <div className="px-4 mb-3">
                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2">
                  <SearchIcon />
                  <span className="text-xs text-gray-400">상품 검색</span>
                </div>
              </div>
            )}

            {/* 5. 배너 슬라이드 */}
            {banners.length > 0 && (
              <div className="px-4 mb-3">
                <div className={`relative overflow-hidden ${shapeClass[cardShape]} ${shadowClass[shadow]}`}>
                  {banners.map((banner, idx2) => (
                    <div
                      key={banner.id}
                      className={`transition-all duration-500 ${
                        idx2 === bannerIdx % banners.length ? "block" : "hidden"
                      } ${
                        animation === "bounce" ? "animate-bounce" : ""
                      }`}
                    >
                      {banner.type === "image" ? (
                        <div className="bg-gradient-to-r from-gray-200 to-gray-300 h-32 flex items-center justify-center relative">
                          {banner.image && (
                            <img
                              src={banner.image}
                              alt={banner.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                          <span className="relative z-[1] text-sm font-semibold text-white drop-shadow-lg">
                            {banner.title || "배너 제목"}
                          </span>
                        </div>
                      ) : (
                        <div
                          className="h-32 flex items-center justify-center text-white text-sm font-medium px-4 text-center"
                          style={{ backgroundColor: banner.bgColor || "#C41E1E" }}
                        >
                          {banner.title || "공지 텍스트"}
                        </div>
                      )}
                    </div>
                  ))}
                  {/* dot indicator */}
                  {banners.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {banners.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            i === bannerIdx % banners.length ? "bg-white" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. 상품 그리드 (3열) */}
            <div className="px-4 pb-8">
              <div className="grid grid-cols-3 gap-2">
                {DUMMY_PRODUCTS.map((product, i) => (
                  <div
                    key={i}
                    className={`${shapeClass[cardShape]} ${shadowClass[shadow]} overflow-hidden bg-white border border-gray-100`}
                  >
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative">
                      {/* 마진율 배지 */}
                      <span className="absolute top-1 right-1 bg-[#C41E1E] text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                        {product.margin}%
                      </span>
                    </div>
                    <div className="p-1.5">
                      <p
                        className="text-[10px] font-medium truncate"
                        style={{ color: themeColors[theme].text }}
                      >
                        {product.name}
                      </p>
                      <p className="text-[10px] text-gray-900 font-semibold">
                        {product.price.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 하단 홈바 */}
          <div className="h-5 bg-gray-800 flex items-center justify-center">
            <div className="w-28 h-1 bg-gray-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* ══════ 토스트 ══════ */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg text-sm z-50">
          저장되었습니다
        </div>
      )}
    </div>
  );
}

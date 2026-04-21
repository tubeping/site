"use client";

import { useState, useEffect } from "react";

// ─── 타입 ───
type ProductSource = "tubeping_campaign" | "coupang" | "naver" | "own" | "other";

interface ShopPick {
  id: string;
  source_type: ProductSource;
  external_url: string | null;
  curation_comment: string | null;
  clicks: number;
  display_order: number;
  source_meta?: Record<string, unknown>;
  product_name?: string;
  price?: number;
  image?: string | null;
  category?: string;
}

interface ShopReview {
  id: string;
  customer_hash: string;
  product_rating: number;
  product_comment: string;
  curation_rating: number;
  curation_comment: string;
  would_rebuy: boolean;
  created_at: string;
}

interface LinkBlock {
  id: string;
  label: string;
  url: string;
  icon: string;
}

interface ShopBlock {
  type: "hero" | "text" | "image" | "gallery" | "banner" | "links" | "picks" | "video" | "divider" | "reviews" | "newsletter" | "html" | "calendar" | "campaign_live" | "campaign_teaser";
  data: Record<string, unknown>;
}

interface ShopCampaign {
  id: string;
  status: string;
  type: string;
  target_gmv: number;
  actual_gmv: number;
  commission_rate: number;
  started_at: string | null;
  settled_at: string | null;
  proposed_at: string | null;
  approved_at: string | null;
  products?: {
    id: string;
    product_name: string;
    image_url: string | null;
    price: number;
  } | null;
}

interface ShopApiResponse {
  creator: {
    id: string;
    name: string;
    shop_slug: string;
    channel_url: string;
    subscriber_count: number;
    category: string;
    platform: string;
  };
  shop: {
    cover_url: string | null;
    profile_url: string | null;
    tagline: string | null;
    link_blocks: LinkBlock[];
    blocks: ShopBlock[] | null;
    theme: Record<string, unknown>;
  } | null;
  picks: ShopPick[];
  reviews: ShopReview[];
  campaigns: ShopCampaign[];
  activeCampaign: {
    id: string;
    product_id: string;
    status: string;
    target_gmv: number;
    commission_rate: number;
    started_at: string | null;
  } | null;
}

interface DisplayPick {
  id: string;
  name: string;
  price: number;
  image: string | null;
  source: ProductSource;
  category: string;
  buyUrl: string;
  curationComment?: string;
}

// ─── 더미 fallback ───
const FALLBACK_PICKS: DisplayPick[] = [
  { id: "fb1", name: "베베바딥 로션 저자극 고보습 케어 250ml", price: 34000, image: "https://ecimg.cafe24img.com/pg1119b83992236021/shinsana/web/product/medium/20250623/4cfe2bc2f5a169545a8a5fe25761c3f0.jpg", source: "tubeping_campaign", category: "뷰티", buyUrl: "https://tubeping.cafe24.com/product/detail.html?product_no=2745" },
  { id: "fb2", name: "왕호떡만두 2팩+김치만두 2팩", price: 24900, image: "https://ecimg.cafe24img.com/pg1119b83992236021/shinsana/web/product/medium/20250623/c01e2014421c64300ca8a4c31d0d6ec9.jpg", source: "tubeping_campaign", category: "식품", buyUrl: "https://tubeping.cafe24.com/product/detail.html?product_no=2746" },
  { id: "fb3", name: "에어프라이어 5.5L 대용량", price: 89900, image: null, source: "coupang", category: "생활", buyUrl: "https://www.coupang.com/np/search?q=에어프라이어+5.5L" },
  { id: "fb4", name: "오설록 제주 녹차 선물세트", price: 35000, image: null, source: "naver", category: "식품", buyUrl: "https://smartstore.naver.com/osulloc" },
];

// ─── 유틸 ───
function formatPrice(n: number) { return n.toLocaleString("ko-KR") + "원"; }

function sourceBadge(source: ProductSource) {
  const map: Record<ProductSource, { label: string; style: string }> = {
    tubeping_campaign: { label: "공구", style: "bg-[#C41E1E] text-white" },
    coupang: { label: "쿠팡", style: "bg-[#e44232] text-white" },
    naver: { label: "네이버", style: "bg-[#03C75A] text-white" },
    own: { label: "직접", style: "bg-[#111111] text-white" },
    other: { label: "기타", style: "bg-gray-500 text-white" },
  };
  return map[source] || map.other;
}

function addUtm(url: string, slug: string) {
  if (!url || url === "#") return "#";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=tubeping&utm_medium=shop&utm_campaign=${slug}`;
}

// ─── 블록 렌더러들 ───

function HeroBlock({ data, creator, shop }: { data: Record<string, unknown>; creator: ShopApiResponse["creator"]; shop: ShopApiResponse["shop"] }) {
  const coverUrl = (data.cover_url as string) || shop?.cover_url;
  const profileUrl = (data.profile_url as string) || shop?.profile_url;
  const name = (data.name as string) || creator.name;
  const bio = (data.bio as string) || shop?.tagline || "";
  const [shareToast, setShareToast] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  };

  return (
    <>
      <div className="relative">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-36 sm:h-48 w-full object-cover" />
        ) : (
          <div className="flex h-36 sm:h-48 w-full items-center justify-center bg-gradient-to-r from-[#C41E1E] to-[#111111]">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white/90">{name}</span>
          </div>
        )}
        <header className="absolute top-0 left-0 right-0 z-10">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <span className="text-lg font-extrabold tracking-tight drop-shadow-sm">
              <span className="text-white">Tube</span><span className="text-white/70">Ping</span>
            </span>
          </div>
        </header>
      </div>
      <div className="mx-auto max-w-2xl px-3 sm:px-4">
        <div className="relative -mt-8 sm:-mt-10 flex items-end gap-3 sm:gap-4">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gray-200 shadow-sm">
            {profileUrl ? (
              <img src={profileUrl} alt={name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <svg className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{name}</h1>
          </div>
        </div>
        {bio && <p className="mt-2 text-sm text-gray-500">{bio}</p>}
        <button onClick={handleShare} className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-[#C41E1E] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          공유하기
        </button>
      </div>
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#111111] px-5 py-2.5 text-sm text-white shadow-lg">
          링크가 복사되었습니다!
        </div>
      )}
    </>
  );
}

function TextBlock({ data }: { data: Record<string, unknown> }) {
  const content = (data.content as string) || "";
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{content}</div>
    </section>
  );
}

function ImageBlock({ data }: { data: Record<string, unknown> }) {
  const url = (data.url as string) || "";
  const caption = (data.caption as string) || "";
  if (!url) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <img src={url} alt={caption} className="w-full rounded-xl" />
      {caption && <p className="mt-2 text-center text-xs text-gray-500">{caption}</p>}
    </section>
  );
}

function GalleryBlock({ data }: { data: Record<string, unknown> }) {
  const images = (data.images as string[]) || [];
  const cols = (data.columns as number) || 2;
  if (images.length === 0) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {images.map((img, i) => (
          <img key={i} src={img} alt="" className="w-full aspect-square rounded-lg object-cover" />
        ))}
      </div>
    </section>
  );
}

function BannerBlock({ data, slug }: { data: Record<string, unknown>; slug: string }) {
  const title = (data.title as string) || "이번 주 공구";
  const subtitle = (data.subtitle as string) || "";
  const imageUrl = data.image_url as string | undefined;
  const linkUrl = (data.link_url as string) || "#";
  const dday = data.dday as number | undefined;

  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <a href={addUtm(linkUrl, slug)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-[#C41E1E] to-[#8B1515] hover:shadow-lg transition-shadow">
        <div className="flex items-center p-5">
          <div className="flex-1">
            {dday !== undefined && (
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white mb-2">
                D-{dday}
              </span>
            )}
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
            <span className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#C41E1E]">
              자세히 보기
            </span>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="" className="ml-4 h-24 w-24 rounded-xl object-cover" />
          )}
        </div>
      </a>
    </section>
  );
}

function LinksBlock({ data, slug }: { data: Record<string, unknown>; slug: string }) {
  const items = (data.items as LinkBlock[]) || [];
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🔗</span>
        <h2 className="text-base font-bold text-gray-900">링크</h2>
      </div>
      <div className="space-y-2">
        {items.map((link) => (
          <a key={link.id} href={addUtm(link.url, slug)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-gray-300 hover:shadow-sm transition-all">
            <span className="text-xl">{link.icon}</span>
            <span className="flex-1 text-sm font-medium text-gray-900">{link.label}</span>
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>
    </section>
  );
}

function VideoBlock({ data }: { data: Record<string, unknown> }) {
  const youtubeUrl = (data.youtube_url as string) || "";
  // 유튜브 URL → embed ID 추출
  let videoId = "";
  const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (match) videoId = match[1];

  if (!videoId) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}

function DividerBlock() {
  return (
    <div className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <hr className="border-gray-200" />
    </div>
  );
}

// ─── 공구 캘린더 블록 ───
interface CalendarEvent {
  id: string;
  title: string;
  image: string | null;
  start_date: string; // ISO
  end_date: string;   // ISO
  price?: number;
  status: "upcoming" | "active" | "ended";
  link_url?: string;
}

function CalendarBlock({ data, campaigns, slug }: { data: Record<string, unknown>; campaigns: ShopCampaign[]; slug: string }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // 공구 기간 기본값 (일수) — settled_at 없을 때 started_at + N일로 추정
  const defaultDurationDays = (data.default_duration_days as number) || 7;
  const manualEvents = (data.manual_events as CalendarEvent[]) || [];

  // campaigns → CalendarEvent 변환
  const autoEvents: CalendarEvent[] = campaigns
    .filter((c) => c.started_at)
    .map((c) => {
      const start = new Date(c.started_at!);
      const end = c.settled_at
        ? new Date(c.settled_at)
        : new Date(start.getTime() + defaultDurationDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      let status: CalendarEvent["status"] = "upcoming";
      if (now >= start && now <= end) status = "active";
      else if (now > end) status = "ended";

      return {
        id: c.id,
        title: c.products?.product_name || "공구",
        image: c.products?.image_url || null,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        price: c.products?.price,
        status,
        link_url: `/shop/${slug}#campaign-${c.id}`,
      };
    });

  const events = [...autoEvents, ...manualEvents];

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=일
  const daysInMonth = lastDay.getDate();

  // 월 그리드 (42칸 = 6주 × 7일)
  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
  while (cells.length < 42) cells.push({ date: null });

  // 날짜별 이벤트 매핑
  const eventsOnDate = (date: Date) => {
    const t = date.getTime();
    return events.filter((e) => {
      const s = new Date(e.start_date).setHours(0, 0, 0, 0);
      const en = new Date(e.end_date).setHours(23, 59, 59, 999);
      return t >= s && t <= en;
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const selectedEvents = selectedDate ? eventsOnDate(selectedDate) : [];

  const goPrevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const goNextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  // 월의 이벤트 요약 (달성률 등)
  const monthEvents = events.filter((e) => {
    const s = new Date(e.start_date);
    const en = new Date(e.end_date);
    const mStart = new Date(year, month, 1);
    const mEnd = new Date(year, month + 1, 0, 23, 59, 59);
    return s <= mEnd && en >= mStart;
  });

  if (events.length === 0 && manualEvents.length === 0) {
    return null; // 공구 없으면 블록 자체 숨김
  }

  const statusBadge = (status: CalendarEvent["status"]) => {
    if (status === "active") return { label: "진행중", style: "bg-[#C41E1E] text-white" };
    if (status === "upcoming") return { label: "예정", style: "bg-blue-500 text-white" };
    return { label: "종료", style: "bg-gray-400 text-white" };
  };

  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📅</span>
        <h2 className="text-base font-bold text-gray-900">공구 캘린더</h2>
        {monthEvents.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">{monthEvents.length}건 예정</span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <button onClick={goPrevMonth} className="cursor-pointer rounded-lg p-1.5 text-gray-500 hover:bg-gray-50">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-sm font-bold text-gray-900">
            {year}년 {month + 1}월
          </p>
          <button onClick={goNextMonth} className="cursor-pointer rounded-lg p-1.5 text-gray-500 hover:bg-gray-50">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
            <div key={d} className={`py-2 text-center text-[11px] font-medium ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell.date) {
              return <div key={i} className="min-h-[56px] border-r border-b border-gray-50 last:border-r-0" />;
            }
            const date = cell.date;
            const isToday = date.getTime() === today.getTime();
            const cellEvents = eventsOnDate(date);
            const hasActive = cellEvents.some((e) => e.status === "active");
            const hasUpcoming = cellEvents.some((e) => e.status === "upcoming");
            const dayOfWeek = date.getDay();
            const isSelected = selectedDate?.getTime() === date.getTime();

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(cellEvents.length > 0 ? date : null)}
                disabled={cellEvents.length === 0}
                className={`relative min-h-[56px] cursor-pointer border-r border-b border-gray-50 p-1 text-left transition-colors last:border-r-0 ${
                  cellEvents.length > 0 ? "hover:bg-gray-50" : "cursor-default"
                } ${isSelected ? "bg-[#fff0f0]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center text-[11px] font-medium ${
                      isToday
                        ? "rounded-full bg-[#C41E1E] text-white"
                        : dayOfWeek === 0
                        ? "text-red-500"
                        : dayOfWeek === 6
                        ? "text-blue-500"
                        : "text-gray-700"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>
                {/* 이벤트 표시 */}
                {cellEvents.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {cellEvents.slice(0, 2).map((e, idx) => (
                      <div
                        key={idx}
                        className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ${
                          e.status === "active"
                            ? "bg-[#C41E1E] text-white"
                            : e.status === "upcoming"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {e.title}
                      </div>
                    ))}
                    {cellEvents.length > 2 && (
                      <div className="text-[9px] text-gray-400">+{cellEvents.length - 2}</div>
                    )}
                  </div>
                )}
                {/* 점 인디케이터 (공간 부족할 때 폴백) */}
                {cellEvents.length > 0 && (hasActive || hasUpcoming) && (
                  <div className="absolute bottom-1 right-1 flex gap-0.5">
                    {hasActive && <span className="h-1.5 w-1.5 rounded-full bg-[#C41E1E]" />}
                    {hasUpcoming && !hasActive && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 선택된 날짜 이벤트 상세 */}
        {selectedDate && selectedEvents.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">
              {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 ({["일", "월", "화", "수", "목", "금", "토"][selectedDate.getDay()]})
            </p>
            <div className="space-y-2">
              {selectedEvents.map((e) => {
                const badge = statusBadge(e.status);
                return (
                  <a
                    key={e.id}
                    href={e.link_url ? addUtm(e.link_url, slug) : "#"}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {e.image ? (
                        <img src={e.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badge.style}`}>{badge.label}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm font-medium text-gray-900">{e.title}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(e.start_date).getMonth() + 1}/{new Date(e.start_date).getDate()}
                        {" ~ "}
                        {new Date(e.end_date).getMonth() + 1}/{new Date(e.end_date).getDate()}
                        {e.price ? ` · ${formatPrice(e.price)}` : ""}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* 범례 */}
        <div className="flex items-center gap-3 border-t border-gray-100 px-4 py-2.5 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#C41E1E]" /> 진행중
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-400" /> 예정
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-400" /> 종료
          </span>
        </div>
      </div>
    </section>
  );
}

function ReviewsBlock({ reviews }: { reviews: ShopReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">💬</span>
        <h2 className="text-base font-bold text-gray-900">큐레이션 리뷰</h2>
        <span className="ml-auto text-xs text-gray-400">
          ★ {(reviews.reduce((a, r) => a + (r.product_rating || 0), 0) / reviews.length).toFixed(1)}
        </span>
      </div>
      <div className="space-y-2">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{review.customer_hash || "익명"}</span>
              <span className="text-xs text-yellow-500">{"★".repeat(review.product_rating || 0)}</span>
              {review.would_rebuy && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">재구매 의사</span>
              )}
              <span className="ml-auto text-xs text-gray-400">{review.created_at?.split("T")[0]}</span>
            </div>
            {review.product_comment && <p className="mt-2 text-sm text-gray-700 leading-relaxed">{review.product_comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function NewsletterBlock() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
        <p className="text-sm font-bold text-gray-900">뉴스레터 구독</p>
        <p className="mt-1 text-xs text-gray-500">새 소식과 추천 상품을 가장 먼저 받아보세요</p>
        {done ? (
          <p className="mt-3 text-sm text-green-600 font-medium">구독 완료!</p>
        ) : (
          <div className="mt-3 flex gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
            <button onClick={() => setDone(true)} className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]">구독</button>
          </div>
        )}
      </div>
    </section>
  );
}

function HtmlBlock({ data }: { data: Record<string, unknown> }) {
  const html = (data.html as string) || "";
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div dangerouslySetInnerHTML={{ __html: html }} className="prose prose-sm max-w-none" />
    </section>
  );
}

// ─── PICK 그리드 ───
function PicksBlock({ picks, slug }: { picks: DisplayPick[]; slug: string }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<DisplayPick | null>(null);

  const categories = [...new Set(picks.map((p) => p.category).filter(Boolean))];
  const filtered = selectedCategory ? picks.filter((p) => p.category === selectedCategory) : picks;

  const IMG_PLACEHOLDER = (
    <svg className="h-12 w-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📦</span>
        <h2 className="text-base font-bold text-gray-900">PICK 컬렉션</h2>
        <span className="ml-auto text-xs text-gray-400">{picks.length}개</span>
      </div>

      {categories.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedCategory(null)} className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${selectedCategory === null ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>전체</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${selectedCategory === cat ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{cat}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {filtered.map((pick) => {
          const badge = sourceBadge(pick.source);
          return (
            <div key={pick.id} onClick={() => setDetail(pick)} className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
              <div className="relative aspect-square bg-gray-100">
                {pick.image ? <img src={pick.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center">{IMG_PLACEHOLDER}</div>}
                <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.style}`}>{badge.label}</span>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">{pick.name}</p>
                <p className="mt-1.5 text-base font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>
                <div className="mt-2 flex items-center justify-center rounded-lg bg-[#C41E1E] py-2 text-sm font-medium text-white group-hover:bg-[#A01818] transition-colors">상세보기</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 상품 상세 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-4 sm:p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 aspect-[4/3] sm:aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
              {detail.image ? <img src={detail.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center">{IMG_PLACEHOLDER}</div>}
            </div>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${sourceBadge(detail.source).style}`}>{sourceBadge(detail.source).label}</span>
            <h3 className="mt-2 text-base font-semibold text-gray-900 leading-snug">{detail.name}</h3>
            <p className="mt-2 text-xl font-bold text-[#C41E1E]">{formatPrice(detail.price)}</p>
            {detail.category && <p className="mt-1 text-xs text-gray-400">카테고리: {detail.category}</p>}
            {detail.curationComment && <p className="mt-2 text-sm text-gray-600 italic">&ldquo;{detail.curationComment}&rdquo;</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDetail(null)} className="flex-1 cursor-pointer rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">닫기</button>
              <a href={addUtm(detail.buyUrl, slug)} target="_blank" rel="noopener noreferrer" className="flex-[2] flex items-center justify-center rounded-xl bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818]">구매하러 가기</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 공구 라이브 블록 (진행률 + 카운트다운) ───
function CampaignLiveBlock({ data, campaigns, slug }: { data: Record<string, unknown>; campaigns: ShopCampaign[]; slug: string }) {
  const defaultDurationDays = (data.default_duration_days as number) || 7;
  const specificId = data.campaign_id as string | undefined;

  // 표시할 캠페인 선택
  const now = Date.now();
  const activeCampaigns = campaigns
    .filter((c) => (c.status === "running" || c.status === "approved") && c.started_at)
    .map((c) => {
      const start = new Date(c.started_at!).getTime();
      const end = c.settled_at
        ? new Date(c.settled_at).getTime()
        : start + defaultDurationDays * 24 * 60 * 60 * 1000;
      return { ...c, _start: start, _end: end };
    })
    .filter((c) => now >= c._start && now <= c._end)
    .sort((a, b) => b._start - a._start);

  const campaign = specificId
    ? activeCampaigns.find((c) => c.id === specificId)
    : activeCampaigns[0];

  // 카운트다운 state (실시간 갱신)
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!campaign) return;
    const tick = () => {
      const diff = campaign._end - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [campaign]);

  if (!campaign || !campaign.products) return null;

  const product = campaign.products;
  const targetGmv = Number(campaign.target_gmv) || 0;
  const actualGmv = Number(campaign.actual_gmv) || 0;
  const progressPct = targetGmv > 0 ? Math.min(100, (actualGmv / targetGmv) * 100) : 0;
  const soldCount = product.price > 0 ? Math.floor(actualGmv / product.price) : 0;
  const targetCount = product.price > 0 && targetGmv > 0 ? Math.floor(targetGmv / product.price) : 0;

  const isUrgent = timeLeft && timeLeft.d === 0 && timeLeft.h < 24;
  const isEnded = timeLeft && timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0;

  const buyUrl = (data.buy_url as string) || `#campaign-${campaign.id}`;

  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className={`overflow-hidden rounded-2xl border ${isUrgent ? "border-[#C41E1E] shadow-lg shadow-red-100" : "border-gray-200"} bg-white`}>
        {/* 상단 라이브 배지 */}
        <div className={`flex items-center gap-2 px-4 py-2 text-white text-xs font-bold ${isUrgent ? "bg-[#C41E1E] animate-pulse" : "bg-[#C41E1E]"}`}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-white" />
          </span>
          {isUrgent ? "⚡ 마감 임박!" : "🔴 LIVE 공구중"}
          {isUrgent && timeLeft && (
            <span className="ml-auto tabular-nums">
              {String(timeLeft.h).padStart(2, "0")}:{String(timeLeft.m).padStart(2, "0")}:{String(timeLeft.s).padStart(2, "0")}
            </span>
          )}
        </div>

        <div className="p-4">
          {/* 상품 정보 */}
          <div className="flex gap-3">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-bold text-gray-900 leading-snug">{product.product_name}</p>
              <p className="mt-1 text-xl font-extrabold text-[#C41E1E]">{formatPrice(product.price)}</p>
              {soldCount > 0 && (
                <p className="mt-0.5 text-[11px] text-gray-500">
                  🔥 지금까지 <b className="text-gray-900">{soldCount}명</b>이 구매했어요
                </p>
              )}
            </div>
          </div>

          {/* 카운트다운 (큰 화면) */}
          {!isUrgent && timeLeft && !isEnded && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex-1 rounded-lg bg-gray-50 py-2 text-center">
                <div className="text-xl font-extrabold tabular-nums text-gray-900">{timeLeft.d}</div>
                <div className="text-[10px] text-gray-500">DAYS</div>
              </div>
              <div className="flex-1 rounded-lg bg-gray-50 py-2 text-center">
                <div className="text-xl font-extrabold tabular-nums text-gray-900">{String(timeLeft.h).padStart(2, "0")}</div>
                <div className="text-[10px] text-gray-500">HOURS</div>
              </div>
              <div className="flex-1 rounded-lg bg-gray-50 py-2 text-center">
                <div className="text-xl font-extrabold tabular-nums text-gray-900">{String(timeLeft.m).padStart(2, "0")}</div>
                <div className="text-[10px] text-gray-500">MIN</div>
              </div>
              <div className="flex-1 rounded-lg bg-gray-50 py-2 text-center">
                <div className="text-xl font-extrabold tabular-nums text-gray-900">{String(timeLeft.s).padStart(2, "0")}</div>
                <div className="text-[10px] text-gray-500">SEC</div>
              </div>
            </div>
          )}

          {/* 마감 임박 배너 */}
          {isUrgent && !isEnded && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-center">
              <p className="text-xs font-bold text-[#C41E1E]">⏰ 놓치면 후회할 마지막 기회</p>
            </div>
          )}

          {isEnded && (
            <div className="mt-3 rounded-lg bg-gray-100 p-3 text-center">
              <p className="text-xs font-bold text-gray-600">공구가 마감되었습니다</p>
            </div>
          )}

          {/* 진행률 바 */}
          {targetCount > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-medium text-gray-700">목표 수량</span>
                <span className="font-bold text-[#C41E1E]">
                  {soldCount} / {targetCount}개 ({progressPct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-[#C41E1E] to-[#FF6B6B] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {progressPct >= 100 && (
                <p className="mt-1.5 text-[11px] font-medium text-green-600">🎉 목표 달성!</p>
              )}
              {progressPct >= 80 && progressPct < 100 && (
                <p className="mt-1.5 text-[11px] font-medium text-[#C41E1E]">🔥 목표 달성 임박!</p>
              )}
            </div>
          )}

          {/* CTA */}
          {!isEnded && (
            <a
              href={addUtm(buyUrl, slug)}
              target={buyUrl.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="mt-4 block w-full rounded-xl bg-[#C41E1E] py-3 text-center text-sm font-bold text-white hover:bg-[#A01818] transition-colors"
            >
              바로 구매하기 →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── 공구 티저 블록 (D-N 알림 신청) ───
function CampaignTeaserBlock({ data, campaigns, creatorId }: {
  data: Record<string, unknown>;
  campaigns: ShopCampaign[];
  creatorId: string;
}) {
  const now = Date.now();
  // 아직 시작하지 않은 예정 캠페인 (started_at > now 또는 approved 상태)
  const upcoming = campaigns
    .filter((c) => {
      if (c.status === "completed") return false;
      if (!c.started_at) return c.status === "proposed" || c.status === "approved";
      return new Date(c.started_at).getTime() > now;
    })
    .sort((a, b) => {
      const as = a.started_at ? new Date(a.started_at).getTime() : Infinity;
      const bs = b.started_at ? new Date(b.started_at).getTime() : Infinity;
      return as - bs;
    });

  const specificId = data.campaign_id as string | undefined;
  const campaign = specificId ? upcoming.find((c) => c.id === specificId) : upcoming[0];

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [notifyCount, setNotifyCount] = useState<number | null>(null);

  useEffect(() => {
    if (!campaign) return;
    fetch(`/api/campaign-notify?campaign_id=${campaign.id}`)
      .then((r) => r.json())
      .then((d) => setNotifyCount(d.count ?? null))
      .catch(() => { /* ignore */ });
  }, [campaign]);

  if (!campaign || !campaign.products) return null;

  const product = campaign.products;
  const startDate = campaign.started_at ? new Date(campaign.started_at) : null;
  const diffMs = startDate ? startDate.getTime() - now : 0;
  const dday = startDate ? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : null;

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("이메일 주소를 확인해주세요");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaign-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          creator_id: creatorId,
          email: email.trim(),
          channel: "email",
        }),
      });
      if (!res.ok) throw new Error("실패");
      setSubmitted(true);
      setNotifyCount((c) => (c ?? 0) + 1);
    } catch {
      setError("신청에 실패했습니다. 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center gap-2 bg-blue-600 px-4 py-2 text-xs font-bold text-white">
          🔔 곧 오픈!
          {dday !== null && dday > 0 && (
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5">D-{dday}</span>
          )}
        </div>

        <div className="p-4">
          <div className="flex gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-bold text-gray-900 leading-snug">{product.product_name}</p>
              {product.price > 0 && (
                <p className="mt-1 text-lg font-extrabold text-blue-600">{formatPrice(product.price)}</p>
              )}
              {startDate && (
                <p className="mt-0.5 text-[11px] text-gray-500">
                  📅 {startDate.getMonth() + 1}월 {startDate.getDate()}일 오픈 예정
                </p>
              )}
            </div>
          </div>

          {/* 참여자 수 */}
          {notifyCount !== null && notifyCount > 0 && (
            <p className="mt-3 text-xs text-gray-600">
              👥 이미 <b className="text-blue-600">{notifyCount}명</b>이 알림을 신청했어요
            </p>
          )}

          {/* 알림 신청 폼 */}
          {submitted ? (
            <div className="mt-4 rounded-xl bg-green-50 p-3 text-center">
              <p className="text-sm font-bold text-green-700">✅ 알림 신청 완료!</p>
              <p className="mt-0.5 text-xs text-green-600">오픈 시 가장 먼저 알려드릴게요</p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="이메일 주소"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "처리 중" : "알림 신청"}
                </button>
              </div>
              {error && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
              <p className="mt-1.5 text-[10px] text-gray-400">
                오픈 시 이메일로 알려드려요. 언제든 구독 해제 가능
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── 블록 디스패처 ───
function BlockRenderer({ block, creator, shop, picks, reviews, campaigns, slug }: {
  block: ShopBlock;
  creator: ShopApiResponse["creator"];
  shop: ShopApiResponse["shop"];
  picks: DisplayPick[];
  reviews: ShopReview[];
  campaigns: ShopCampaign[];
  slug: string;
}) {
  switch (block.type) {
    case "hero": return <HeroBlock data={block.data} creator={creator} shop={shop} />;
    case "text": return <TextBlock data={block.data} />;
    case "image": return <ImageBlock data={block.data} />;
    case "gallery": return <GalleryBlock data={block.data} />;
    case "banner": return <BannerBlock data={block.data} slug={slug} />;
    case "links": return <LinksBlock data={block.data} slug={slug} />;
    case "picks": return <PicksBlock picks={picks} slug={slug} />;
    case "video": return <VideoBlock data={block.data} />;
    case "divider": return <DividerBlock />;
    case "reviews": return <ReviewsBlock reviews={reviews} />;
    case "newsletter": return <NewsletterBlock />;
    case "html": return <HtmlBlock data={block.data} />;
    case "calendar": return <CalendarBlock data={block.data} campaigns={campaigns} slug={slug} />;
    case "campaign_live": return <CampaignLiveBlock data={block.data} campaigns={campaigns} slug={slug} />;
    case "campaign_teaser": return <CampaignTeaserBlock data={block.data} campaigns={campaigns} creatorId={creator.id} />;
    default: return null;
  }
}

// ─── 기본 블록 레이아웃 (blocks 미설정 시 폴백) ───
function defaultBlocks(
  shop: ShopApiResponse["shop"],
  hasCampaigns: boolean,
  hasActiveCampaign: boolean,
  hasUpcomingCampaign: boolean
): ShopBlock[] {
  const blocks: ShopBlock[] = [
    { type: "hero", data: {} },
  ];
  // 진행중 공구가 최우선, 없으면 예정 공구 티저
  if (hasActiveCampaign) {
    blocks.push({ type: "campaign_live", data: {} });
  } else if (hasUpcomingCampaign) {
    blocks.push({ type: "campaign_teaser", data: {} });
  }
  if (shop?.link_blocks && shop.link_blocks.length > 0) {
    blocks.push({ type: "links", data: { items: shop.link_blocks } });
  }
  if (hasCampaigns) {
    blocks.push({ type: "calendar", data: {} });
  }
  blocks.push({ type: "picks", data: {} });
  blocks.push({ type: "reviews", data: {} });
  return blocks;
}

// ─── 메인 ───
export default function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [data, setData] = useState<ShopApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { params.then((p) => setSlug(p.slug)); }, [params]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/shop?slug=${slug}`)
      .then((r) => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then((d) => { setData(d); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading || !slug) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <h1 className="text-6xl font-extrabold text-gray-200">404</h1>
        <p className="mt-4 text-gray-500">존재하지 않는 쇼핑몰입니다</p>
        <a href="/" className="mt-6 text-sm text-[#C41E1E] hover:underline">홈으로</a>
      </div>
    );
  }

  const { creator, shop, picks, reviews, campaigns } = data;
  const safeCampaigns = campaigns || [];

  // PICK 데이터 변환
  const displayPicks: DisplayPick[] = picks.length > 0
    ? picks.map((p) => ({
        id: p.id,
        name: (p.source_meta?.name as string) || p.product_name || "상품",
        price: (p.source_meta?.price as number) || p.price || 0,
        image: (p.source_meta?.image as string) || p.image || null,
        source: p.source_type,
        category: (p.source_meta?.category as string) || p.category || "",
        buyUrl: p.external_url || "#",
        curationComment: p.curation_comment || undefined,
      }))
    : FALLBACK_PICKS;

  // 진행중 / 예정 캠페인 여부
  const nowTs = Date.now();
  const hasActiveCampaign = safeCampaigns.some((c) => {
    if (!c.started_at) return false;
    const start = new Date(c.started_at).getTime();
    const end = c.settled_at
      ? new Date(c.settled_at).getTime()
      : start + 7 * 24 * 60 * 60 * 1000;
    return (c.status === "running" || c.status === "approved") && nowTs >= start && nowTs <= end;
  });
  const hasUpcomingCampaign = safeCampaigns.some((c) => {
    if (c.status === "completed") return false;
    if (!c.started_at) return c.status === "proposed" || c.status === "approved";
    return new Date(c.started_at).getTime() > nowTs;
  });

  // 블록 결정: DB에 blocks가 있으면 사용, 없으면 기본 레이아웃
  const blocks: ShopBlock[] = (shop?.blocks && Array.isArray(shop.blocks) && shop.blocks.length > 0)
    ? shop.blocks
    : defaultBlocks(shop, safeCampaigns.length > 0, hasActiveCampaign, hasUpcomingCampaign);

  return (
    <div className="min-h-screen bg-gray-50">
      {blocks.map((block, idx) => (
        <BlockRenderer
          key={idx}
          block={block}
          creator={creator}
          shop={shop}
          picks={displayPicks}
          reviews={reviews}
          campaigns={safeCampaigns}
          slug={slug}
        />
      ))}

      <footer className="border-t border-gray-100 bg-white py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <span className="font-semibold">
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-[#111111]">Ping</span>
          </span>
        </p>
      </footer>
    </div>
  );
}

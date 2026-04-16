"use client";

import { useState } from "react";
import CampaignInbox from "./_components/CampaignInbox";
import MyPicks from "./_components/MyPicks";
import ProductRecommend from "./_components/ProductRecommend";
import Partners from "./_components/Partners";
import ShopCustomize from "./_components/ShopCustomize";
import ContentAnalytics from "./_components/ContentAnalytics";
import AutoDM from "./_components/AutoDM";
import Earnings from "./_components/Earnings";
import FanInsights from "./_components/FanInsights";
import Settings from "./_components/Settings";

type MenuKey = "inbox" | "recommend" | "picks" | "partners" | "shop" | "analytics" | "autodm" | "earnings" | "fans" | "settings";

const MENU_ITEMS: { key: MenuKey; label: string; icon: string }[] = [
  { key: "inbox", label: "공구 제안함", icon: "🔔" },
  { key: "recommend", label: "상품 추천", icon: "🎯" },
  { key: "picks", label: "내 PICK", icon: "📦" },
  { key: "partners", label: "파트너스", icon: "🔗" },
  { key: "shop", label: "몰 꾸미기", icon: "🎨" },
  { key: "analytics", label: "공구 스크립트", icon: "📝" },
  { key: "autodm", label: "자동응답", icon: "💬" },
  { key: "earnings", label: "수익", icon: "💰" },
  { key: "fans", label: "팬 인사이트", icon: "👥" },
  { key: "settings", label: "설정", icon: "⚙️" },
];

export default function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("inbox");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const content: Record<MenuKey, React.ReactNode> = {
    inbox: <CampaignInbox />,
    recommend: <ProductRecommend />,
    picks: <MyPicks />,
    partners: <Partners />,
    shop: <ShopCustomize />,
    analytics: <ContentAnalytics />,
    autodm: <AutoDM />,
    earnings: <Earnings />,
    fans: <FanInsights />,
    settings: <Settings />,
  };

  const activeLabel = MENU_ITEMS.find((m) => m.key === activeMenu);

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* ── 모바일 상단 바 ── */}
      <header className="flex md:hidden items-center gap-3 bg-black px-4 py-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="cursor-pointer text-white"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <span className="text-sm font-medium text-white">{activeLabel?.icon} {activeLabel?.label}</span>
        <span className="ml-auto text-lg font-extrabold tracking-tight">
          <span className="text-[#C41E1E]">Tube</span>
          <span className="text-white">Ping</span>
        </span>
      </header>

      {/* ── 모바일 드롭다운 메뉴 ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black border-t border-white/10">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveMenu(item.key); setMobileMenuOpen(false); }}
              className={`flex w-full items-center gap-3 px-5 py-3 text-sm font-medium cursor-pointer ${
                activeMenu === item.key
                  ? "bg-[#C41E1E] text-white"
                  : "text-gray-400"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <a
            href="/shop/gwibinjeong"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mx-4 my-3 rounded-lg border border-white/20 py-2.5 text-sm font-medium text-white/70"
          >
            내 쇼핑몰 보기
          </a>
        </div>
      )}

      {/* ── PC 사이드바 ── */}
      <aside className="hidden md:flex w-[260px] bg-black flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-6">
          <span className="text-2xl font-extrabold tracking-tight">
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-white">Ping</span>
          </span>
        </div>

        {/* Menu */}
        <nav className="flex flex-col mt-2">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveMenu(item.key)}
              className={`flex items-center gap-3 text-left px-6 py-3.5 text-sm font-medium transition-colors cursor-pointer ${
                activeMenu === item.key
                  ? "bg-[#C41E1E] text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 내 쇼핑몰 보기 */}
        <div className="mt-auto px-6 pb-6">
          <a
            href="/shop/gwibinjeong"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-white/20 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            내 쇼핑몰 보기
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-white overflow-y-auto">{content[activeMenu]}</main>
    </div>
  );
}

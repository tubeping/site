"use client";

import Link from "next/link";

type SettingItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  status?: "ready" | "wip";
};

const SETTINGS: SettingItem[] = [
  {
    title: "스토어 관리",
    description: "카페24 OAuth 스토어 등록·토큰 관리·연동 설정",
    href: "/system/stores",
    status: "ready",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    title: "디자인 시스템",
    description: "컴포넌트 카탈로그·디자인 토큰·UI 가이드 (개발자용)",
    href: "/design-system",
    status: "ready",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    title: "환경 설정",
    description: "API 키·웹훅·기본값·알림 (작업 예정)",
    href: "/system/settings",
    status: "wip",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
];

export default function SystemSettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">시스템 설정</h1>
        <p className="text-sm text-gray-500 mt-1">스토어 연동, 디자인 시스템, 환경 설정을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SETTINGS.map((item) => {
          const isWip = item.status === "wip";
          return (
            <Link
              key={item.title}
              href={item.href}
              className={`group bg-white rounded-xl border border-gray-200 p-5 hover:border-[#C41E1E] hover:shadow-sm transition-all ${
                isWip ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#FFF0F5] flex items-center justify-center text-[#C41E1E] flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#C41E1E] transition-colors">
                      {item.title}
                    </h3>
                    {isWip && (
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        준비중
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

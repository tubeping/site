"use client";

import { useState } from "react";
import EmailCollector from "./_components/email-collector";
import EmailSender from "./_components/email-sender";
import CrmManager from "./_components/crm-manager";

const TABS = [
  { key: "collect", label: "이메일 수집", icon: "🔍" },
  { key: "send", label: "메일 발송", icon: "✉️" },
  { key: "crm", label: "CRM 관리", icon: "📊" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function OutreachPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("collect");

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">유튜버 아웃리치</h1>
        <p className="text-sm text-gray-500 mt-1">
          YouTube 채널 이메일 수집 → 영업 메일 발송 → 회신/계약 추적
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-white text-[#C41E1E] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "collect" && <EmailCollector />}
      {activeTab === "send" && <EmailSender />}
      {activeTab === "crm" && <CrmManager />}
    </div>
  );
}

"use client";

import { useState } from "react";

type YouTuber = {
  channelId: string;
  channelName: string;
  email: string;
  subscriberCount: number;
  status: string;
  emailSentAt: string | null;
  repliedAt: string | null;
  contractedAt: string | null;
  memo: string;
};

const MOCK_YOUTUBERS: YouTuber[] = [
  { channelId: "UC001", channelName: "테크리뷰TV", email: "techreview@gmail.com", subscriberCount: 520000, status: "contracted", emailSentAt: "2026-03-15", repliedAt: "2026-03-17", contractedAt: "2026-03-25", memo: "월 200만원 계약, PB 상품 기획 중" },
  { channelId: "UC004", channelName: "요리의신", email: "cook.god@gmail.com", subscriberCount: 310000, status: "meeting", emailSentAt: "2026-03-20", repliedAt: "2026-03-22", contractedAt: null, memo: "4/5 미팅 예정" },
  { channelId: "UC006", channelName: "패션피플", email: "fashionppl@outlook.com", subscriberCount: 420000, status: "replied", emailSentAt: "2026-03-25", repliedAt: "2026-03-28", contractedAt: null, memo: "관심 있다고 회신, 상세 자료 요청" },
  { channelId: "UC008", channelName: "머니톡", email: "moneytalk.biz@gmail.com", subscriberCount: 250000, status: "emailed", emailSentAt: "2026-03-28", repliedAt: null, contractedAt: null, memo: "" },
  { channelId: "UC005", channelName: "스마트홈가이드", email: "smarthome.guide@gmail.com", subscriberCount: 140000, status: "emailed", emailSentAt: "2026-03-29", repliedAt: null, contractedAt: null, memo: "" },
  { channelId: "UC002", channelName: "일상브이로그", email: "daily_vlog@naver.com", subscriberCount: 180000, status: "no_reply", emailSentAt: "2026-03-18", repliedAt: null, contractedAt: null, memo: "1차 메일 무응답" },
  { channelId: "UC009", channelName: "뷰티랩", email: "beautylab@gmail.com", subscriberCount: 380000, status: "rejected", emailSentAt: "2026-03-10", repliedAt: "2026-03-12", contractedAt: null, memo: "현재 다른 곳과 계약 중" },
  { channelId: "UC010", channelName: "여행의맛", email: "travelyum@gmail.com", subscriberCount: 220000, status: "collected", emailSentAt: null, repliedAt: null, contractedAt: null, memo: "" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  collected: { label: "수집완료", color: "bg-gray-100 text-gray-600" },
  emailed: { label: "메일발송", color: "bg-blue-100 text-blue-700" },
  no_reply: { label: "무응답", color: "bg-yellow-100 text-yellow-700" },
  replied: { label: "회신", color: "bg-purple-100 text-purple-700" },
  meeting: { label: "미팅", color: "bg-indigo-100 text-indigo-700" },
  contracted: { label: "계약완료", color: "bg-green-100 text-green-700" },
  rejected: { label: "거절", color: "bg-red-100 text-red-700" },
  unsubscribed: { label: "수신거부", color: "bg-gray-200 text-gray-500" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString();
}

export default function CrmManager() {
  const [youtubers] = useState<YouTuber[]>(MOCK_YOUTUBERS);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editingMemo, setEditingMemo] = useState<string | null>(null);

  const filtered = youtubers.filter((y) => {
    if (filterStatus !== "all" && y.status !== filterStatus) return false;
    if (searchKeyword && !y.channelName.includes(searchKeyword) && !y.email.includes(searchKeyword))
      return false;
    return true;
  });

  // Stats
  const stats = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = youtubers.filter((y) => y.status === s).length;
    return acc;
  }, {});
  const totalCount = youtubers.length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-7 gap-3">
        {ALL_STATUSES.filter((s) => s !== "unsubscribed").map((s) => {
          const config = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                filterStatus === s
                  ? "border-[#C41E1E] bg-[#FFF0F5] ring-1 ring-[#C41E1E]/20"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-2xl font-bold text-gray-900">{stats[s] || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Funnel Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">영업 퍼널</h2>
        <div className="flex items-center gap-2">
          {[
            { status: "collected", count: stats["collected"] || 0 },
            { status: "emailed", count: stats["emailed"] || 0 },
            { status: "replied", count: stats["replied"] || 0 },
            { status: "meeting", count: stats["meeting"] || 0 },
            { status: "contracted", count: stats["contracted"] || 0 },
          ].map((step, i, arr) => (
            <div key={step.status} className="flex items-center gap-2 flex-1">
              <div className="flex-1 text-center">
                <div
                  className={`py-3 rounded-lg ${STATUS_CONFIG[step.status].color}`}
                >
                  <p className="text-lg font-bold">{step.count}</p>
                  <p className="text-xs font-medium">{STATUS_CONFIG[step.status].label}</p>
                </div>
                {i < arr.length - 1 && step.count > 0 && arr[i + 1].count > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {((arr[i + 1].count / step.count) * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              {i < arr.length - 1 && (
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500 text-right">
          전체 전환율: {totalCount > 0 ? (((stats["contracted"] || 0) / totalCount) * 100).toFixed(1) : 0}%
          (수집 → 계약)
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="채널명 또는 이메일로 검색..."
          className="flex-1 max-w-sm px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
        >
          <option value="all">전체 상태</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label} ({stats[s] || 0})
            </option>
          ))}
        </select>
        <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
          회신 자동 체크
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            유튜버 목록
            <span className="ml-2 text-sm font-normal text-gray-500">({filtered.length}건)</span>
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-50">
              <th className="text-left px-6 py-3 font-medium">채널명</th>
              <th className="text-left px-3 py-3 font-medium">이메일</th>
              <th className="text-right px-3 py-3 font-medium">구독자</th>
              <th className="text-center px-3 py-3 font-medium">상태</th>
              <th className="text-left px-3 py-3 font-medium">발송일</th>
              <th className="text-left px-3 py-3 font-medium">회신일</th>
              <th className="text-left px-3 py-3 font-medium">메모</th>
              <th className="text-center px-6 py-3 font-medium">상태 변경</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((y) => (
              <tr
                key={y.channelId}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{y.channelName}</td>
                <td className="px-3 py-3 text-sm text-blue-600">{y.email}</td>
                <td className="px-3 py-3 text-sm text-gray-700 text-right">
                  {formatNumber(y.subscriberCount)}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CONFIG[y.status]?.color || "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_CONFIG[y.status]?.label || y.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">{y.emailSentAt || "-"}</td>
                <td className="px-3 py-3 text-sm text-gray-500">{y.repliedAt || "-"}</td>
                <td className="px-3 py-3">
                  {editingMemo === y.channelId ? (
                    <input
                      autoFocus
                      defaultValue={y.memo}
                      onBlur={() => setEditingMemo(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditingMemo(null);
                      }}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#C41E1E]"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingMemo(y.channelId)}
                      className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer text-left max-w-[200px] truncate block"
                      title={y.memo || "메모 추가"}
                    >
                      {y.memo || <span className="text-gray-300">메모 추가...</span>}
                    </button>
                  )}
                </td>
                <td className="px-6 py-3 text-center">
                  <select
                    value={y.status}
                    onChange={() => {}}
                    className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none cursor-pointer"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

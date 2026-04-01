"use client";

import { useState } from "react";

type Recipient = {
  channelId: string;
  channelName: string;
  email: string;
  subscriberCount: number;
  status: "pending" | "sending" | "sent" | "failed";
  sentAt: string | null;
};

const MOCK_RECIPIENTS: Recipient[] = [
  { channelId: "UC001", channelName: "테크리뷰TV", email: "techreview@gmail.com", subscriberCount: 520000, status: "pending", sentAt: null },
  { channelId: "UC004", channelName: "요리의신", email: "cook.god@gmail.com", subscriberCount: 310000, status: "pending", sentAt: null },
  { channelId: "UC005", channelName: "스마트홈가이드", email: "smarthome.guide@gmail.com", subscriberCount: 140000, status: "pending", sentAt: null },
  { channelId: "UC006", channelName: "패션피플", email: "fashionppl@outlook.com", subscriberCount: 420000, status: "pending", sentAt: null },
  { channelId: "UC008", channelName: "머니톡", email: "moneytalk.biz@gmail.com", subscriberCount: 250000, status: "pending", sentAt: null },
  { channelId: "UC002", channelName: "일상브이로그", email: "daily_vlog@naver.com", subscriberCount: 180000, status: "pending", sentAt: null },
];

const TEMPLATES = [
  { key: "default", label: "기본 영업 메일", description: "유튜브 쇼핑 제안 + 튜핑 서비스 소개" },
  { key: "data-driven", label: "데이터 기반 제안", description: "판매 공식 + 수익 구조 분석 중심" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  sending: "bg-yellow-100 text-yellow-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  sending: "발송 중",
  sent: "발송 완료",
  failed: "실패",
};

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  return n.toLocaleString();
}

export default function EmailSender() {
  const [recipients, setRecipients] = useState<Recipient[]>(MOCK_RECIPIENTS);
  const [selectedTemplate, setSelectedTemplate] = useState("default");
  const [subject, setSubject] = useState("유튜브 채널 트래픽을 자산화하는 방법을 공유드립니다!");
  const [senderName, setSenderName] = useState("최준");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const pendingIds = recipients.filter((r) => r.status === "pending").map((r) => r.channelId);
    if (selected.size === pendingIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  };

  const handleSend = () => {
    if (selected.size === 0) return;
    setIsSending(true);

    // 더미: 30초 간격 순차 발송 시뮬레이션
    const ids = Array.from(selected);
    let idx = 0;

    const sendNext = () => {
      if (idx >= ids.length) {
        setIsSending(false);
        setSelected(new Set());
        return;
      }
      const currentId = ids[idx];
      setRecipients((prev) =>
        prev.map((r) =>
          r.channelId === currentId ? { ...r, status: "sending" as const } : r
        )
      );

      setTimeout(() => {
        setRecipients((prev) =>
          prev.map((r) =>
            r.channelId === currentId
              ? { ...r, status: "sent" as const, sentAt: new Date().toISOString().split("T")[0] }
              : r
          )
        );
        idx++;
        sendNext();
      }, 800);
    };

    sendNext();
  };

  const pendingCount = recipients.filter((r) => r.status === "pending").length;
  const sentCount = recipients.filter((r) => r.status === "sent").length;

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">발송 설정</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">메일 템플릿</label>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <label
                  key={t.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTemplate === t.key
                      ? "border-[#C41E1E] bg-[#FFF0F5]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={t.key}
                    checked={selectedTemplate === t.key}
                    onChange={() => setSelectedTemplate(t.key)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">메일 제목</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">발신자 이름</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
              />
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-[#C41E1E] font-medium hover:underline cursor-pointer"
            >
              {showPreview ? "미리보기 닫기" : "메일 미리보기"}
            </button>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">미리보기 (첫 번째 수신자 기준)</p>
            <div className="bg-white p-4 rounded-lg border border-gray-100 text-sm leading-relaxed">
              <p className="font-semibold text-[#1a73e8] text-lg mb-3">
                {recipients[0]?.channelName || "채널명"} 채널 담당자님, 안녕하세요!
              </p>
              <p className="mb-2">
                저는 <strong>튜핑(TubePing)</strong>에서 유튜브 쇼핑 채널 파트너십을 담당하고 있는 {senderName}입니다.
              </p>
              <p className="mb-2">
                {recipients[0]?.channelName || "채널명"} 채널의 콘텐츠를 인상 깊게 보았습니다.
                <span className="bg-yellow-100 px-1 rounded">
                  구독자 {formatNumber(recipients[0]?.subscriberCount || 0)}명
                </span>
                의 채널 영향력과 독보적인 콘텐츠 품질이 저희 서비스와 시너지를 낼 수 있을 것으로 확신합니다.
              </p>
              <p className="text-gray-400 text-xs mt-3">... (이하 생략)</p>
            </div>
          </div>
        )}
      </div>

      {/* Recipient List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-gray-900">발송 대상</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                대기 {pendingCount}개
              </span>
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">
                발송완료 {sentCount}개
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSending && (
              <span className="text-xs text-yellow-600 font-medium">발송 중... (30초 간격)</span>
            )}
            <button
              onClick={handleSend}
              disabled={selected.size === 0 || isSending}
              className="px-5 py-2 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isSending ? "발송 중..." : `선택 발송 (${selected.size}건)`}
            </button>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-50">
              <th className="text-left px-6 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === pendingCount}
                  onChange={toggleAll}
                  className="rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="text-left px-3 py-3 font-medium">채널명</th>
              <th className="text-left px-3 py-3 font-medium">이메일</th>
              <th className="text-right px-3 py-3 font-medium">구독자</th>
              <th className="text-center px-3 py-3 font-medium">상태</th>
              <th className="text-right px-6 py-3 font-medium">발송일</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr
                key={r.channelId}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
              >
                <td className="px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.channelId)}
                    onChange={() => toggleSelect(r.channelId)}
                    disabled={r.status !== "pending"}
                    className="rounded border-gray-300 cursor-pointer disabled:opacity-30"
                  />
                </td>
                <td className="px-3 py-3 text-sm font-medium text-gray-900">{r.channelName}</td>
                <td className="px-3 py-3 text-sm text-blue-600">{r.email}</td>
                <td className="px-3 py-3 text-sm text-gray-700 text-right">
                  {formatNumber(r.subscriberCount)}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[r.status]}`}
                  >
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 text-right">
                  {r.sentAt || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

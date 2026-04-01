"use client";

import { useState } from "react";

type CollectedChannel = {
  channelId: string;
  channelName: string;
  email: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  collectedAt: string;
};

const MOCK_RESULTS: CollectedChannel[] = [
  { channelId: "UC001", channelName: "테크리뷰TV", email: "techreview@gmail.com", subscriberCount: 520000, viewCount: 89000000, videoCount: 342, collectedAt: "2026-04-01" },
  { channelId: "UC002", channelName: "일상브이로그", email: "daily_vlog@naver.com", subscriberCount: 180000, viewCount: 32000000, videoCount: 215, collectedAt: "2026-04-01" },
  { channelId: "UC003", channelName: "건강지킴이", email: null, subscriberCount: 95000, viewCount: 15000000, videoCount: 178, collectedAt: "2026-04-01" },
  { channelId: "UC004", channelName: "요리의신", email: "cook.god@gmail.com", subscriberCount: 310000, viewCount: 56000000, videoCount: 420, collectedAt: "2026-04-01" },
  { channelId: "UC005", channelName: "스마트홈가이드", email: "smarthome.guide@gmail.com", subscriberCount: 140000, viewCount: 21000000, videoCount: 156, collectedAt: "2026-04-01" },
  { channelId: "UC006", channelName: "패션피플", email: "fashionppl@outlook.com", subscriberCount: 420000, viewCount: 72000000, videoCount: 510, collectedAt: "2026-04-01" },
  { channelId: "UC007", channelName: "게임천국", email: null, subscriberCount: 680000, viewCount: 150000000, videoCount: 890, collectedAt: "2026-04-01" },
  { channelId: "UC008", channelName: "머니톡", email: "moneytalk.biz@gmail.com", subscriberCount: 250000, viewCount: 41000000, videoCount: 312, collectedAt: "2026-04-01" },
];

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toString();
}

export default function EmailCollector() {
  const [query, setQuery] = useState("");
  const [minSubscribers, setMinSubscribers] = useState("10000");
  const [maxResults, setMaxResults] = useState("50");
  const [isCollecting, setIsCollecting] = useState(false);
  const [results, setResults] = useState<CollectedChannel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleCollect = () => {
    setIsCollecting(true);
    // 더미: 실제로는 YouTube API 호출
    setTimeout(() => {
      setResults(MOCK_RESULTS);
      setIsCollecting(false);
    }, 1500);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.channelId)));
    }
  };

  const emailCount = results.filter((r) => r.email).length;

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">채널 검색</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">검색 키워드</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 유튜브 쇼핑, 먹방, 테크 리뷰..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">최소 구독자</label>
            <select
              value={minSubscribers}
              onChange={(e) => setMinSubscribers(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
            >
              <option value="0">제한 없음</option>
              <option value="1000">1,000+</option>
              <option value="5000">5,000+</option>
              <option value="10000">10,000+</option>
              <option value="50000">50,000+</option>
              <option value="100000">100,000+</option>
              <option value="500000">500,000+</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">최대 수집 수</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
            >
              <option value="20">20개</option>
              <option value="50">50개</option>
              <option value="100">100개</option>
              <option value="200">200개</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleCollect}
            disabled={!query.trim() || isCollecting}
            className="px-6 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isCollecting ? "수집 중..." : "이메일 수집 시작"}
          </button>
          {isCollecting && (
            <span className="text-sm text-gray-500">YouTube API에서 채널 정보를 가져오는 중...</span>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-semibold text-gray-900">수집 결과</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  전체 {results.length}개
                </span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">
                  이메일 있음 {emailCount}개
                </span>
                <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full">
                  이메일 없음 {results.length - emailCount}개
                </span>
              </div>
            </div>
            <button
              disabled={selected.size === 0}
              className="px-4 py-2 bg-[#C41E1E] text-white text-xs font-medium rounded-lg hover:bg-[#A01818] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              선택 항목 CRM에 저장 ({selected.size}개)
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-50">
                <th className="text-left px-6 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={selected.size === results.length && results.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="text-left px-3 py-3 font-medium">채널명</th>
                <th className="text-left px-3 py-3 font-medium">이메일</th>
                <th className="text-right px-3 py-3 font-medium">구독자</th>
                <th className="text-right px-3 py-3 font-medium">총 조회수</th>
                <th className="text-right px-3 py-3 font-medium">영상 수</th>
                <th className="text-right px-6 py-3 font-medium">수집일</th>
              </tr>
            </thead>
            <tbody>
              {results.map((ch) => (
                <tr
                  key={ch.channelId}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(ch.channelId)}
                      onChange={() => toggleSelect(ch.channelId)}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">{ch.channelName}</td>
                  <td className="px-3 py-3 text-sm">
                    {ch.email ? (
                      <span className="text-blue-600">{ch.email}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 text-right">
                    {formatNumber(ch.subscriberCount)}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 text-right">
                    {formatNumber(ch.viewCount)}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 text-right">{ch.videoCount}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 text-right">{ch.collectedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

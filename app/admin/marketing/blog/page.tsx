"use client";

import { useState } from "react";

const DUMMY_POSTS = [
  { id: 1, title: "2026년 봄 인기 상품 트렌드 분석", status: "발행됨", category: "트렌드", author: "마케팅팀", date: "2026-03-28", views: 1243 },
  { id: 2, title: "유튜브 쇼핑 성공 사례 TOP 5", status: "발행됨", category: "사례분석", author: "콘텐츠팀", date: "2026-03-25", views: 892 },
  { id: 3, title: "인플루언서 마케팅 ROI 극대화 전략", status: "초안", category: "전략", author: "마케팅팀", date: "2026-03-22", views: 0 },
  { id: 4, title: "4월 시즌 키워드 분석 리포트", status: "검토중", category: "리포트", author: "데이터팀", date: "2026-03-20", views: 0 },
  { id: 5, title: "카테고리별 마진율 비교 가이드", status: "발행됨", category: "가이드", author: "상품팀", date: "2026-03-18", views: 2105 },
  { id: 6, title: "SEO 최적화 체크리스트 2026", status: "발행됨", category: "가이드", author: "콘텐츠팀", date: "2026-03-15", views: 3421 },
];

const STATUS_STYLE: Record<string, string> = {
  "발행됨": "bg-green-100 text-green-700",
  "초안": "bg-gray-100 text-gray-600",
  "검토중": "bg-yellow-100 text-yellow-700",
};

export default function BlogPage() {
  const [search, setSearch] = useState("");

  const filtered = DUMMY_POSTS.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">블로그</h1>
          <p className="text-sm text-gray-500 mt-1">블로그 게시글을 관리합니다.</p>
        </div>
        <button className="px-4 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] transition-colors cursor-pointer">
          + 새 게시글
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="게시글 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium">제목</th>
              <th className="text-left px-3 py-3 font-medium">카테고리</th>
              <th className="text-left px-3 py-3 font-medium">작성자</th>
              <th className="text-center px-3 py-3 font-medium">상태</th>
              <th className="text-right px-3 py-3 font-medium">조회수</th>
              <th className="text-right px-6 py-3 font-medium">날짜</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((post) => (
              <tr key={post.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer">
                <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{post.title}</td>
                <td className="px-3 py-3.5 text-sm text-gray-500">{post.category}</td>
                <td className="px-3 py-3.5 text-sm text-gray-500">{post.author}</td>
                <td className="px-3 py-3.5 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[post.status]}`}>
                    {post.status}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-sm text-gray-500 text-right">{post.views.toLocaleString()}</td>
                <td className="px-6 py-3.5 text-sm text-gray-500 text-right">{post.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

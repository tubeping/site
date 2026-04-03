"use client";

import { useState } from "react";
import Sidebar from "./_components/sidebar";

const STATS = [
  { label: "총 상품 수", value: "1,284", change: "+12%", up: true },
  { label: "이번 달 발주", value: "326", change: "+8%", up: true },
  { label: "미정산 금액", value: "₩4,520,000", change: "-3%", up: false },
  { label: "블로그 게시글", value: "89", change: "+21%", up: true },
];

const RECENT_ORDERS = [
  { id: "ORD-2026-0401", product: "프리미엄 무선 이어폰", channel: "테크리뷰TV", qty: 50, status: "발주완료", date: "2026-04-01" },
  { id: "ORD-2026-0399", product: "스테인리스 텀블러", channel: "일상브이로그", qty: 120, status: "배송중", date: "2026-03-31" },
  { id: "ORD-2026-0398", product: "비타민C 1000mg", channel: "건강지킴이", qty: 200, status: "정산대기", date: "2026-03-30" },
  { id: "ORD-2026-0395", product: "로봇청소기 X200", channel: "스마트홈가이드", qty: 30, status: "발주완료", date: "2026-03-29" },
  { id: "ORD-2026-0392", product: "에어프라이어 5.5L", channel: "요리의신", qty: 80, status: "배송완료", date: "2026-03-28" },
];

const TASKS = [
  { title: "Vercel 카페24 환경변수 업데이트", assignee: "개발팀", due: "04/03", priority: "높음" },
  { title: "상품관리 옵션/재고/카페24 동기화", assignee: "개발팀", due: "04/05", priority: "높음" },
  { title: "3월 정산 마감", assignee: "재무팀", due: "04/07", priority: "높음" },
];

const STATUS_COLORS: Record<string, string> = {
  "발주완료": "bg-blue-100 text-blue-700",
  "배송중": "bg-yellow-100 text-yellow-700",
  "정산대기": "bg-orange-100 text-orange-700",
  "배송완료": "bg-green-100 text-green-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  "높음": "bg-red-100 text-red-700",
  "중간": "bg-yellow-100 text-yellow-700",
  "낮음": "bg-gray-100 text-gray-500",
};

export default function AdminDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        }`}
      >
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">TubePing 어드민 현황을 한눈에 확인하세요.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-5 mb-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-xs mt-2 font-medium ${stat.up ? "text-green-600" : "text-red-500"}`}>
                  {stat.change} vs 지난달
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Recent Orders */}
            <div className="col-span-2 bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">최근 발주</h2>
                <span className="text-xs text-gray-400">최근 5건</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-50">
                    <th className="text-left px-6 py-3 font-medium">주문번호</th>
                    <th className="text-left px-3 py-3 font-medium">상품</th>
                    <th className="text-left px-3 py-3 font-medium">채널</th>
                    <th className="text-right px-3 py-3 font-medium">수량</th>
                    <th className="text-center px-3 py-3 font-medium">상태</th>
                    <th className="text-right px-6 py-3 font-medium">날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_ORDERS.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{order.id}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{order.product}</td>
                      <td className="px-3 py-3 text-sm text-gray-500">{order.channel}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 text-right">{order.qty}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 text-right">{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tasks */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">진행 중 작업</h2>
              </div>
              <div className="p-4 space-y-3">
                {TASKS.map((task) => (
                  <div key={task.title} className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{task.assignee}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{task.due}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

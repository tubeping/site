"use client";

import { useState } from "react";

const DUMMY_PRODUCTS = [
  { id: "P001", name: "프리미엄 무선 이어폰", category: "전자기기", supplier: "테크월드", price: 39900, stock: 450, status: "판매중" },
  { id: "P002", name: "스테인리스 텀블러 500ml", category: "생활용품", supplier: "리빙플러스", price: 18900, stock: 1200, status: "판매중" },
  { id: "P003", name: "비타민C 1000mg (60정)", category: "건강식품", supplier: "헬스팜", price: 24900, stock: 800, status: "판매중" },
  { id: "P004", name: "로봇청소기 X200", category: "가전", supplier: "스마트홈코리아", price: 289000, stock: 45, status: "품절임박" },
  { id: "P005", name: "에어프라이어 5.5L", category: "가전", supplier: "키친마스터", price: 79900, stock: 230, status: "판매중" },
  { id: "P006", name: "무선 충전 패드 15W", category: "전자기기", supplier: "테크월드", price: 19900, stock: 0, status: "품절" },
  { id: "P007", name: "캠핑 접이식 체어", category: "아웃도어", supplier: "캠프잇", price: 34900, stock: 180, status: "판매중" },
  { id: "P008", name: "프로틴 쉐이크 초코맛", category: "건강식품", supplier: "헬스팜", price: 32000, stock: 560, status: "판매중" },
];

const STATUS_STYLE: Record<string, string> = {
  "판매중": "bg-green-100 text-green-700",
  "품절임박": "bg-orange-100 text-orange-700",
  "품절": "bg-red-100 text-red-700",
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");

  const filtered = DUMMY_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품관리</h1>
          <p className="text-sm text-gray-500 mt-1">종합몰 상품을 등록하고 관리합니다.</p>
        </div>
        <button className="px-4 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] transition-colors cursor-pointer">
          + 상품 등록
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          placeholder="상품명 또는 공급사 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C41E1E]/20 focus:border-[#C41E1E]"
        />
        <select className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 focus:outline-none cursor-pointer">
          <option>전체 카테고리</option>
          <option>전자기기</option>
          <option>생활용품</option>
          <option>건강식품</option>
          <option>가전</option>
          <option>아웃도어</option>
        </select>
        <select className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 focus:outline-none cursor-pointer">
          <option>전체 상태</option>
          <option>판매중</option>
          <option>품절임박</option>
          <option>품절</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium">상품코드</th>
              <th className="text-left px-3 py-3 font-medium">상품명</th>
              <th className="text-left px-3 py-3 font-medium">카테고리</th>
              <th className="text-left px-3 py-3 font-medium">공급사</th>
              <th className="text-right px-3 py-3 font-medium">판매가</th>
              <th className="text-right px-3 py-3 font-medium">재고</th>
              <th className="text-center px-6 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer">
                <td className="px-6 py-3.5 text-sm text-gray-500 font-mono">{p.id}</td>
                <td className="px-3 py-3.5 text-sm font-medium text-gray-900">{p.name}</td>
                <td className="px-3 py-3.5 text-sm text-gray-500">{p.category}</td>
                <td className="px-3 py-3.5 text-sm text-gray-500">{p.supplier}</td>
                <td className="px-3 py-3.5 text-sm text-gray-700 text-right">₩{p.price.toLocaleString()}</td>
                <td className="px-3 py-3.5 text-sm text-gray-700 text-right">{p.stock.toLocaleString()}</td>
                <td className="px-6 py-3.5 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[p.status]}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

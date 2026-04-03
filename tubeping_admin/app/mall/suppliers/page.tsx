"use client";

import { useState, useEffect } from "react";

interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  business_no: string;
  memo: string;
  status: string;
  created_at: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    business_no: "",
    memo: "",
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    const res = await fetch("/admin/api/suppliers");
    const data = await res.json();
    setSuppliers(data.suppliers || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;

    await fetch("/admin/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({ name: "", contact_name: "", email: "", phone: "", business_no: "", memo: "" });
    setShowForm(false);
    fetchSuppliers();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공급사 관리</h1>
          <p className="text-sm text-gray-500 mt-1">발주서를 발송할 공급사 목록을 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] transition-colors cursor-pointer"
        >
          + 공급사 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">새 공급사 등록</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">공급사명 *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="테크월드"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">이메일 *</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="order@techworld.co.kr"
                type="email"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">담당자</label>
              <input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="김담당"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">연락처</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="02-1234-5678"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">사업자번호</label>
              <input
                value={form.business_no}
                onChange={(e) => setForm({ ...form, business_no: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="123-45-67890"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">메모</label>
              <input
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#C41E1E] text-white text-sm rounded-lg hover:bg-[#A01818] cursor-pointer"
            >
              등록
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-400">불러오는 중...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            등록된 공급사가 없습니다. &quot;공급사 추가&quot; 버튼으로 등록하세요.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium">공급사명</th>
                <th className="text-left px-3 py-3 font-medium">담당자</th>
                <th className="text-left px-3 py-3 font-medium">이메일</th>
                <th className="text-left px-3 py-3 font-medium">연락처</th>
                <th className="text-left px-3 py-3 font-medium">사업자번호</th>
                <th className="text-center px-3 py-3 font-medium">상태</th>
                <th className="text-right px-6 py-3 font-medium">등록일</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-3 py-3.5 text-sm text-gray-700">{s.contact_name || "-"}</td>
                  <td className="px-3 py-3.5 text-sm text-gray-500">{s.email}</td>
                  <td className="px-3 py-3.5 text-sm text-gray-500">{s.phone || "-"}</td>
                  <td className="px-3 py-3.5 text-sm text-gray-500">{s.business_no || "-"}</td>
                  <td className="px-3 py-3.5 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.status === "active" ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-500 text-right">
                    {s.created_at?.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

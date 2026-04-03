"use client";

import { useState, useEffect, useCallback } from "react";

interface Order {
  id: string;
  cafe24_order_id: string;
  cafe24_order_item_code: string;
  order_date: string;
  product_name: string;
  option_text: string;
  quantity: number;
  product_price: number;
  order_amount: number;
  shipping_status: string;
  shipping_company: string;
  tracking_number: string;
  cafe24_shipping_synced: boolean;
  supplier_id: string | null;
  purchase_order_id: string | null;
  stores: { name: string; mall_id: string } | null;
  suppliers: { name: string; email: string } | null;
}

interface Supplier {
  id: string;
  name: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  ordered: "발주완료",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  ordered: "bg-blue-100 text-blue-700",
  shipping: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    params.set("limit", "100");

    const res = await fetch(`/admin/api/orders?${params}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [filterStatus]);

  const fetchSuppliers = async () => {
    const res = await fetch("/admin/api/suppliers?status=active");
    const data = await res.json();
    setSuppliers(data.suppliers || []);
  };

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
  }, [fetchOrders]);

  // 카페24 주문 수집
  const handleSync = async () => {
    setSyncing(true);
    await fetch("/admin/api/cafe24/orders");
    await fetchOrders();
    setSyncing(false);
  };

  // 카페24 송장 연동
  const handleShipmentSync = async () => {
    setSyncing(true);
    await fetch("/admin/api/cafe24/shipments", { method: "POST", body: "{}" });
    await fetchOrders();
    setSyncing(false);
  };

  // 공급사 배정
  const handleAssignSupplier = async (supplierId: string) => {
    if (selected.size === 0) return;
    await fetch("/admin/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: Array.from(selected),
        updates: { supplier_id: supplierId },
      }),
    });
    setSelected(new Set());
    fetchOrders();
  };

  // 발주서 생성
  const handleCreatePO = async (supplierId: string) => {
    const orderIds = Array.from(selected);
    if (orderIds.length === 0) return;

    const res = await fetch("/admin/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplier_id: supplierId, order_ids: orderIds }),
    });
    const data = await res.json();
    if (data.purchase_order) {
      alert(`발주서 생성 완료: ${data.purchase_order.po_number}\n비밀번호: ${data.purchase_order.access_password}`);
    }
    setSelected(new Set());
    fetchOrders();
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
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  };

  // 통계
  const stats = {
    total: total,
    pending: orders.filter((o) => o.shipping_status === "pending").length,
    shipping: orders.filter((o) => o.shipping_status === "shipping").length,
    unsynced: orders.filter((o) => o.tracking_number && !o.cafe24_shipping_synced).length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">주문관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            카페24 주문 수집 → 공급사 발주 → 송장 연동까지 통합 관리
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2.5 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {syncing ? "수집 중..." : "주문 수집"}
          </button>
          {stats.unsynced > 0 && (
            <button
              onClick={handleShipmentSync}
              disabled={syncing}
              className="px-4 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] transition-colors cursor-pointer disabled:opacity-50"
            >
              송장 연동 ({stats.unsynced}건)
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "전체 주문", value: `${stats.total}건` },
          { label: "처리대기", value: `${stats.pending}건`, highlight: stats.pending > 0 },
          { label: "배송중", value: `${stats.shipping}건` },
          { label: "송장 미연동", value: `${stats.unsynced}건`, highlight: stats.unsynced > 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.highlight ? "text-[#C41E1E]" : "text-gray-900"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        {/* 상태 필터 */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* 선택된 항목 액션 */}
        {selected.size > 0 && (
          <>
            <span className="text-sm text-gray-500">{selected.size}건 선택</span>
            <select
              onChange={(e) => {
                if (e.target.value) handleAssignSupplier(e.target.value);
                e.target.value = "";
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">공급사 배정</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              onChange={(e) => {
                if (e.target.value) handleCreatePO(e.target.value);
                e.target.value = "";
              }}
              className="text-sm border border-blue-400 text-blue-700 bg-blue-50 rounded-lg px-3 py-2"
            >
              <option value="">발주서 생성</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-400">불러오는 중...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            주문이 없습니다. &quot;주문 수집&quot; 버튼으로 카페24 주문을 가져오세요.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === orders.length && orders.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-3 py-3 font-medium">주문번호</th>
                <th className="text-left px-3 py-3 font-medium">상품</th>
                <th className="text-left px-3 py-3 font-medium">스토어</th>
                <th className="text-left px-3 py-3 font-medium">공급사</th>
                <th className="text-right px-3 py-3 font-medium">수량</th>
                <th className="text-right px-3 py-3 font-medium">금액</th>
                <th className="text-center px-3 py-3 font-medium">상태</th>
                <th className="text-left px-3 py-3 font-medium">송장</th>
                <th className="text-center px-3 py-3 font-medium">연동</th>
                <th className="text-right px-6 py-3 font-medium">주문일</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer ${
                    selected.has(o.id) ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => toggleSelect(o.id)}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleSelect(o.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900">
                    {o.cafe24_order_id}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">
                    <div>{o.product_name}</div>
                    {o.option_text && (
                      <div className="text-xs text-gray-400">{o.option_text}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500">
                    {o.stores?.name || "-"}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500">
                    {o.suppliers?.name || (
                      <span className="text-gray-300">미배정</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 text-right">
                    {o.quantity}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 text-right">
                    ₩{o.order_amount.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        STATUS_STYLE[o.shipping_status] || STATUS_STYLE.pending
                      }`}
                    >
                      {STATUS_LABEL[o.shipping_status] || o.shipping_status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500">
                    {o.tracking_number ? (
                      <span className="text-xs">
                        {o.shipping_company} {o.tracking_number}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {o.tracking_number ? (
                      o.cafe24_shipping_synced ? (
                        <span className="text-green-500 text-xs">완료</span>
                      ) : (
                        <span className="text-orange-500 text-xs">대기</span>
                      )
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 text-right">
                    {o.order_date?.slice(0, 10)}
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

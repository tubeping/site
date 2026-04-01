const ORDERS = [
  { id: "ORD-2026-0401", product: "프리미엄 무선 이어폰", channel: "테크리뷰TV", supplier: "테크월드", qty: 50, amount: 1995000, status: "발주완료", date: "2026-04-01" },
  { id: "ORD-2026-0399", product: "스테인리스 텀블러", channel: "일상브이로그", supplier: "리빙플러스", qty: 120, amount: 2268000, status: "배송중", date: "2026-03-31" },
  { id: "ORD-2026-0398", product: "비타민C 1000mg", channel: "건강지킴이", supplier: "헬스팜", qty: 200, amount: 4980000, status: "정산대기", date: "2026-03-30" },
  { id: "ORD-2026-0395", product: "로봇청소기 X200", channel: "스마트홈가이드", supplier: "스마트홈코리아", qty: 30, amount: 8670000, status: "발주완료", date: "2026-03-29" },
  { id: "ORD-2026-0392", product: "에어프라이어 5.5L", channel: "요리의신", supplier: "키친마스터", qty: 80, amount: 6392000, status: "배송완료", date: "2026-03-28" },
  { id: "ORD-2026-0388", product: "캠핑 접이식 체어", channel: "캠핑마스터", supplier: "캠프잇", qty: 60, amount: 2094000, status: "배송완료", date: "2026-03-27" },
  { id: "ORD-2026-0385", product: "프로틴 쉐이크", channel: "헬스타그램", supplier: "헬스팜", qty: 150, amount: 4800000, status: "정산완료", date: "2026-03-25" },
];

const STATUS_STYLE: Record<string, string> = {
  "발주완료": "bg-blue-100 text-blue-700",
  "배송중": "bg-yellow-100 text-yellow-700",
  "정산대기": "bg-orange-100 text-orange-700",
  "배송완료": "bg-green-100 text-green-700",
  "정산완료": "bg-gray-100 text-gray-500",
};

export default function OrdersPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">발주관리</h1>
          <p className="text-sm text-gray-500 mt-1">발주 현황과 배송 상태를 관리합니다.</p>
        </div>
        <button className="px-4 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] transition-colors cursor-pointer">
          + 신규 발주
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "전체 발주", value: "7건" },
          { label: "배송중", value: "1건" },
          { label: "정산대기", value: "1건" },
          { label: "이번 달 발주액", value: "₩31,199,000" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium">발주번호</th>
              <th className="text-left px-3 py-3 font-medium">상품</th>
              <th className="text-left px-3 py-3 font-medium">채널</th>
              <th className="text-left px-3 py-3 font-medium">공급사</th>
              <th className="text-right px-3 py-3 font-medium">수량</th>
              <th className="text-right px-3 py-3 font-medium">금액</th>
              <th className="text-center px-3 py-3 font-medium">상태</th>
              <th className="text-right px-6 py-3 font-medium">날짜</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer">
                <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{o.id}</td>
                <td className="px-3 py-3.5 text-sm text-gray-700">{o.product}</td>
                <td className="px-3 py-3.5 text-sm text-gray-500">{o.channel}</td>
                <td className="px-3 py-3.5 text-sm text-gray-500">{o.supplier}</td>
                <td className="px-3 py-3.5 text-sm text-gray-700 text-right">{o.qty}</td>
                <td className="px-3 py-3.5 text-sm text-gray-700 text-right">₩{o.amount.toLocaleString()}</td>
                <td className="px-3 py-3.5 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[o.status]}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-500 text-right">{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

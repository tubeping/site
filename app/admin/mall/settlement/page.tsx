const SETTLEMENTS = [
  { id: "STL-2026-03", period: "2026년 3월", supplier: "테크월드", amount: 8500000, commission: 1275000, net: 7225000, status: "정산완료", paidDate: "2026-03-31" },
  { id: "STL-2026-03", period: "2026년 3월", supplier: "리빙플러스", amount: 5200000, commission: 780000, net: 4420000, status: "정산완료", paidDate: "2026-03-31" },
  { id: "STL-2026-03", period: "2026년 3월", supplier: "헬스팜", amount: 12300000, commission: 1845000, net: 10455000, status: "대기", paidDate: "-" },
  { id: "STL-2026-03", period: "2026년 3월", supplier: "스마트홈코리아", amount: 8670000, commission: 1300500, net: 7369500, status: "대기", paidDate: "-" },
  { id: "STL-2026-03", period: "2026년 3월", supplier: "키친마스터", amount: 6392000, commission: 958800, net: 5433200, status: "진행중", paidDate: "-" },
  { id: "STL-2026-02", period: "2026년 2월", supplier: "캠프잇", amount: 4200000, commission: 630000, net: 3570000, status: "정산완료", paidDate: "2026-02-28" },
];

const STATUS_STYLE: Record<string, string> = {
  "정산완료": "bg-green-100 text-green-700",
  "대기": "bg-orange-100 text-orange-700",
  "진행중": "bg-blue-100 text-blue-700",
};

export default function SettlementPage() {
  const totalAmount = SETTLEMENTS.reduce((sum, s) => sum + s.amount, 0);
  const totalCommission = SETTLEMENTS.reduce((sum, s) => sum + s.commission, 0);
  const totalNet = SETTLEMENTS.reduce((sum, s) => sum + s.net, 0);
  const pendingCount = SETTLEMENTS.filter((s) => s.status !== "정산완료").length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">정산관리</h1>
        <p className="text-sm text-gray-500 mt-1">공급사별 정산 현황을 관리합니다.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "총 거래액", value: `₩${totalAmount.toLocaleString()}` },
          { label: "총 수수료", value: `₩${totalCommission.toLocaleString()}` },
          { label: "순 정산액", value: `₩${totalNet.toLocaleString()}` },
          { label: "미정산 건수", value: `${pendingCount}건` },
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
              <th className="text-left px-6 py-3 font-medium">정산기간</th>
              <th className="text-left px-3 py-3 font-medium">공급사</th>
              <th className="text-right px-3 py-3 font-medium">거래액</th>
              <th className="text-right px-3 py-3 font-medium">수수료(15%)</th>
              <th className="text-right px-3 py-3 font-medium">정산액</th>
              <th className="text-center px-3 py-3 font-medium">상태</th>
              <th className="text-right px-6 py-3 font-medium">지급일</th>
            </tr>
          </thead>
          <tbody>
            {SETTLEMENTS.map((s, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-6 py-3.5 text-sm text-gray-700">{s.period}</td>
                <td className="px-3 py-3.5 text-sm font-medium text-gray-900">{s.supplier}</td>
                <td className="px-3 py-3.5 text-sm text-gray-700 text-right">₩{s.amount.toLocaleString()}</td>
                <td className="px-3 py-3.5 text-sm text-gray-500 text-right">₩{s.commission.toLocaleString()}</td>
                <td className="px-3 py-3.5 text-sm font-medium text-gray-900 text-right">₩{s.net.toLocaleString()}</td>
                <td className="px-3 py-3.5 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-500 text-right">{s.paidDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/settlements/[id]/excel — 정산서 Excel 다운로드 (CSV 형식)
 * 실제 xlsx 생성은 클라이언트에서 처리하거나 추후 openpyxl 연동
 * 여기서는 정산 데이터를 JSON으로 반환 (프론트에서 xlsx 생성)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = getServiceClient();

  const { data: settlement } = await sb
    .from("settlements")
    .select("*, stores(name, mall_id, settlement_type, influencer_rate, company_rate, bank_name, bank_account, bank_holder)")
    .eq("id", id)
    .single();

  if (!settlement) {
    return NextResponse.json({ error: "정산을 찾을 수 없습니다" }, { status: 404 });
  }

  const { data: items } = await sb
    .from("settlement_items")
    .select("*")
    .eq("settlement_id", id)
    .order("order_date", { ascending: true });

  // CSV 생성
  const headers = [
    "구분", "주문번호", "품목별코드", "주문일", "상품명", "옵션",
    "수량", "상품단가", "주문금액", "배송비", "할인", "정산매출",
    "공급가", "공급가합계", "공급배송비", "과세구분", "공급사",
  ];

  const rows = (items || []).map((item: Record<string, unknown>) => [
    item.item_type,
    item.cafe24_order_id,
    item.cafe24_order_item_code,
    item.order_date,
    item.product_name,
    item.option_text,
    item.quantity,
    item.product_price,
    item.order_amount,
    item.shipping_fee,
    item.discount_amount,
    item.settled_amount,
    item.supply_price,
    item.supply_total,
    item.supply_shipping,
    item.tax_type,
    item.supplier_name,
  ]);

  // BOM + CSV
  const csvContent = "\uFEFF" + [headers, ...rows].map((r) => r.join(",")).join("\n");

  const storeName = (settlement.stores as Record<string, string>)?.name || "정산";
  const filename = encodeURIComponent(`${storeName}_${settlement.period}_정산상세.csv`);

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

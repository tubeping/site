import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/supplier-portal/download — 발주서 Excel 다운로드
 * ?po_number=xxx&password=xxx
 *
 * CSV 형식으로 반환 (공급사가 Excel에서 열어서 송장번호 입력 후 업로드)
 * 컬럼: 주문번호, 주문상품고유번호, 상품코드, 상품명, 옵션, 수량, 수령자, 배송지, 우편번호, 택배사, 배송번호
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const poNumber = searchParams.get("po_number");
  const password = searchParams.get("password");

  if (!poNumber || !password) {
    return NextResponse.json({ error: "po_number, password 필수" }, { status: 400 });
  }

  const sb = getServiceClient();

  // 인증
  const { data: po } = await sb
    .from("purchase_orders")
    .select("id, access_password, access_expires_at")
    .eq("po_number", poNumber)
    .single();

  if (!po) {
    return NextResponse.json({ error: "발주서를 찾을 수 없습니다" }, { status: 404 });
  }
  if (po.access_password !== password) {
    return NextResponse.json({ error: "비밀번호 불일치" }, { status: 401 });
  }

  // 주문 목록
  const { data: orders } = await sb
    .from("orders")
    .select(
      "cafe24_order_id, cafe24_order_item_code, cafe24_product_no, product_name, option_text, quantity, receiver_name, receiver_address, receiver_zipcode, shipping_company, tracking_number"
    )
    .eq("purchase_order_id", po.id)
    .order("cafe24_order_id", { ascending: true });

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: "주문이 없습니다" }, { status: 404 });
  }

  // BOM + CSV 생성
  const BOM = "\uFEFF";
  const header = "주문번호,주문상품고유번호,상품코드,상품명,옵션,수량,수령자,배송지,우편번호,택배사,배송번호";
  const rows = orders.map((o) =>
    [
      o.cafe24_order_id,
      o.cafe24_order_item_code,
      o.cafe24_product_no,
      `"${(o.product_name || "").replace(/"/g, '""')}"`,
      `"${(o.option_text || "").replace(/"/g, '""')}"`,
      o.quantity,
      o.receiver_name,
      `"${(o.receiver_address || "").replace(/"/g, '""')}"`,
      o.receiver_zipcode,
      o.shipping_company || "",
      o.tracking_number || "",
    ].join(",")
  );

  const csv = BOM + header + "\n" + rows.join("\n");
  const filename = `발주서_${poNumber}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/orders — 통합 주문 목록 (Supabase)
 * ?status=pending&store_id=xxx&supplier_id=xxx&start_date=&end_date=&limit=50&offset=0
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const storeId = searchParams.get("store_id");
  const supplierId = searchParams.get("supplier_id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const poId = searchParams.get("purchase_order_id");

  const sb = getServiceClient();
  let query = sb
    .from("orders")
    .select(
      "*, stores:store_id(name, mall_id), suppliers:supplier_id(name, email)",
      { count: "exact" }
    )
    .order("order_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("shipping_status", status);
  if (storeId) query = query.eq("store_id", storeId);
  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (poId) query = query.eq("purchase_order_id", poId);
  if (startDate) query = query.gte("order_date", startDate);
  if (endDate) query = query.lte("order_date", endDate + "T23:59:59");

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data, total: count });
}

/**
 * PATCH /api/orders — 주문 일괄 수정 (공급사 배정, 상태 변경 등)
 * body: { ids: string[], updates: { supplier_id?, shipping_status?, memo? } }
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { ids, updates } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids 필수 (배열)" }, { status: 400 });
  }

  const allowedFields = ["supplier_id", "shipping_status", "memo", "purchase_order_id"];
  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: "수정할 필드 없음" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("orders")
    .update(filtered)
    .in("id", ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: data?.length || 0 });
}

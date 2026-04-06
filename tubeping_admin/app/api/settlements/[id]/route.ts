import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/settlements/[id] — 정산 상세 (헤더 + 아이템)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = getServiceClient();

  const { data: settlement, error } = await sb
    .from("settlements")
    .select("*, stores(id, name, mall_id, settlement_type, influencer_rate, company_rate, bank_name, bank_account, bank_holder, contact_name, contact_email)")
    .eq("id", id)
    .single();

  if (error || !settlement) {
    return NextResponse.json({ error: "정산을 찾을 수 없습니다" }, { status: 404 });
  }

  // 상세 아이템
  const { data: items } = await sb
    .from("settlement_items")
    .select("*")
    .eq("settlement_id", id)
    .order("order_date", { ascending: true });

  // 상품별 요약
  const productMap: Record<string, {
    product_name: string;
    quantity: number;
    sales: number;
    cogs: number;
    shipping: number;
  }> = {};

  for (const item of (items || [])) {
    const key = item.product_name || "기타";
    if (!productMap[key]) {
      productMap[key] = { product_name: key, quantity: 0, sales: 0, cogs: 0, shipping: 0 };
    }
    productMap[key].quantity += item.quantity || 0;
    productMap[key].sales += item.settled_amount || 0;
    productMap[key].cogs += item.supply_total || 0;
    productMap[key].shipping += item.supply_shipping || 0;
  }

  const productSummary = Object.values(productMap)
    .filter((p) => p.sales > 0 || p.quantity > 0)
    .sort((a, b) => b.sales - a.sales)
    .map((p) => ({
      ...p,
      profit: p.sales - p.cogs - p.shipping,
      margin: p.sales > 0 ? Math.round(((p.sales - p.cogs - p.shipping) / p.sales) * 1000) / 10 : 0,
    }));

  return NextResponse.json({ settlement, items: items || [], productSummary });
}

/**
 * PATCH /api/settlements/[id] — 상태 변경
 * body: { status: "confirmed" | "paid", memo? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status, memo } = body;

  if (!status || !["draft", "confirmed", "paid"].includes(status)) {
    return NextResponse.json({ error: "유효한 status: draft, confirmed, paid" }, { status: 400 });
  }

  const sb = getServiceClient();

  const updates: Record<string, unknown> = { status };
  if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
  if (status === "paid") updates.paid_at = new Date().toISOString();
  if (memo !== undefined) updates.memo = memo;

  const { data, error } = await sb
    .from("settlements")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settlement: data });
}

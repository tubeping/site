import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/settlements — 정산 목록
 * ?period=2026-03 &store_id=xxx &status=draft
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const period = sp.get("period");
  const storeId = sp.get("store_id");
  const status = sp.get("status");

  const sb = getServiceClient();
  let q = sb
    .from("settlements")
    .select("*, stores(id, name, mall_id, influencer_rate, company_rate, settlement_type)")
    .order("created_at", { ascending: false });

  if (period) q = q.eq("period", period);
  if (storeId) q = q.eq("store_id", storeId);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settlements: data });
}

/**
 * DELETE /api/settlements — 정산 삭제 (draft만)
 * body: { id }
 */
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  const sb = getServiceClient();

  // draft만 삭제 가능
  const { data: existing } = await sb
    .from("settlements")
    .select("status")
    .eq("id", id)
    .single();

  if (existing?.status !== "draft") {
    return NextResponse.json({ error: "확정된 정산은 삭제할 수 없습니다" }, { status: 400 });
  }

  // settlement_items는 ON DELETE CASCADE
  const { error } = await sb.from("settlements").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

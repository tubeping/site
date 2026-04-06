import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * PATCH /api/stores/settlement-config
 * 판매자(스토어) 정산 조건 업데이트
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { store_id, ...updates } = body;

  if (!store_id) {
    return NextResponse.json({ error: "store_id 필수" }, { status: 400 });
  }

  const allowed = [
    "influencer_rate", "company_rate", "settlement_type", "pg_fee_rate",
    "tpl_cost", "other_cost", "other_cost_label",
    "bank_name", "bank_account", "bank_holder", "business_no",
    "contact_name", "contact_email", "contact_phone",
  ];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  // 비율 합계 검증
  if (filtered.influencer_rate !== undefined || filtered.company_rate !== undefined) {
    const inf = Number(filtered.influencer_rate ?? updates.influencer_rate ?? 70);
    const co = Number(filtered.company_rate ?? updates.company_rate ?? 30);
    if (Math.abs(inf + co - 100) > 0.01) {
      return NextResponse.json({ error: "인플루언서 + 회사 비율 합이 100%이어야 합니다" }, { status: 400 });
    }
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("stores")
    .update(filtered)
    .eq("id", store_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store: data });
}

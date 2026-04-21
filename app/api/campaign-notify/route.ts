import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign_id, creator_id, email, phone, channel } = body;

    if (!campaign_id || !creator_id) {
      return NextResponse.json({ error: "campaign_id, creator_id 필요" }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json({ error: "이메일 또는 휴대폰 필요" }, { status: 400 });
    }

    // 이메일 형식 기본 검증
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "유효하지 않은 이메일" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "";

    const { data, error } = await supabaseAdmin
      .from("campaign_notifications")
      .upsert(
        {
          campaign_id,
          creator_id,
          contact_email: email || null,
          contact_phone: phone || null,
          notify_channel: channel || "email",
          notify_at_open: true,
          notify_before_close: true,
          user_agent: userAgent,
        },
        { onConflict: "campaign_id,contact_email" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "처리 실패" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaign_id");
  if (!campaignId) {
    return NextResponse.json({ count: 0 }, { status: 400 });
  }

  const { count } = await supabaseAdmin
    .from("campaign_notifications")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  return NextResponse.json({ count: count || 0 });
}

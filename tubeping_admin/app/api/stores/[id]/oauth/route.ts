import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const CLIENT_ID = process.env.CAFE24_CLIENT_ID || "";

/**
 * GET /api/stores/[id]/oauth — OAuth 인증 URL 생성
 * 해당 스토어의 카페24 OAuth 페이지로 리다이렉트
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = getServiceClient();
  const { data: store } = await sb
    .from("stores")
    .select("mall_id")
    .eq("id", id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "스토어를 찾을 수 없습니다" }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/admin/api/stores/oauth/callback`;

  const authUrl = new URL(`https://${store.mall_id}.cafe24api.com/api/v2/oauth/authorize`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("state", id); // store id를 state로 전달
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", [
    "mall.read_application",
    "mall.write_application",
    "mall.read_category",
    "mall.write_category",
    "mall.read_product",
    "mall.write_product",
    "mall.read_collection",
    "mall.write_collection",
    "mall.read_supply",
    "mall.write_supply",
    "mall.read_order",
    "mall.write_order",
  ].join(","));

  return NextResponse.redirect(authUrl.toString());
}

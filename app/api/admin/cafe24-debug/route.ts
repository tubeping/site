import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.ADMIN_API_KEY || process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productName = searchParams.get("name") || "타이탄 원터치";

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("mall_id, access_token, token_expires_at, status")
    .eq("mall_id", "tubeping")
    .maybeSingle();

  const result: Record<string, unknown> = {
    storesTable: {
      mall_id: store?.mall_id,
      has_token: !!store?.access_token,
      token_length: store?.access_token?.length || 0,
      token_preview: store?.access_token ? store.access_token.slice(0, 5) + "..." : null,
      expires_at: store?.token_expires_at,
    },
    envTokens: {
      CAFE24_MALL_ID: process.env.CAFE24_MALL_ID,
      CAFE24_ACCESS_TOKEN_length: process.env.CAFE24_ACCESS_TOKEN?.length || 0,
      CAFE24_ACCESS_TOKEN_preview: process.env.CAFE24_ACCESS_TOKEN?.slice(0, 5) + "...",
    },
  };

  // stores 토큰 시도
  if (store?.access_token && store?.mall_id) {
    const url = `https://${store.mall_id}.cafe24api.com/api/v2/admin/products?product_name=${encodeURIComponent(
      productName
    )}&limit=3`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${store.access_token}`,
          "Content-Type": "application/json",
          "X-Cafe24-Api-Version": "2024-12-01",
        },
      });
      const text = await res.text();
      result.storesTokenTest = {
        url,
        status: res.status,
        body: text.slice(0, 1000),
      };
    } catch (e) {
      result.storesTokenTest = { error: String(e) };
    }
  }

  // env 토큰 시도
  if (process.env.CAFE24_ACCESS_TOKEN && process.env.CAFE24_MALL_ID) {
    const url = `https://${process.env.CAFE24_MALL_ID}.cafe24api.com/api/v2/admin/products?product_name=${encodeURIComponent(
      productName
    )}&limit=3`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.CAFE24_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Cafe24-Api-Version": "2024-12-01",
        },
      });
      const text = await res.text();
      result.envTokenTest = {
        url,
        status: res.status,
        body: text.slice(0, 1000),
      };
    } catch (e) {
      result.envTokenTest = { error: String(e) };
    }
  }

  return NextResponse.json(result);
}

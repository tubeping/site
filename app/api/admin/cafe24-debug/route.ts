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

  // 모든 stores row 확인 (어디에 본 토큰이 있는지)
  const { data: allStores } = await supabaseAdmin
    .from("stores")
    .select("id, mall_id, status, access_token, token_expires_at, updated_at, last_sync_at")
    .order("updated_at", { ascending: false });

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("mall_id, access_token, token_expires_at, status")
    .eq("mall_id", "tubeping")
    .maybeSingle();

  const result: Record<string, unknown> = {
    allStoresOverview: (allStores || []).map((s) => ({
      mall_id: s.mall_id,
      status: s.status,
      has_token: !!s.access_token,
      token_length: s.access_token?.length || 0,
      token_preview: s.access_token ? s.access_token.slice(0, 5) + "..." : null,
      expires_at: s.token_expires_at,
      updated_at: s.updated_at,
      last_sync_at: s.last_sync_at,
    })),
    storesTable: {
      mall_id: store?.mall_id,
      has_token: !!store?.access_token,
      token_length: store?.access_token?.length || 0,
      token_preview: store?.access_token ? store.access_token.slice(0, 5) + "..." : null,
      expires_at: store?.token_expires_at,
    },
    envTokens: {
      CAFE24_MALL_ID_raw: JSON.stringify(process.env.CAFE24_MALL_ID),
      CAFE24_MALL_ID_trimmed: process.env.CAFE24_MALL_ID?.trim(),
      CAFE24_ACCESS_TOKEN_length: process.env.CAFE24_ACCESS_TOKEN?.length || 0,
      CAFE24_ACCESS_TOKEN_preview: process.env.CAFE24_ACCESS_TOKEN?.slice(0, 5) + "...",
    },
  };

  // env 토큰 재시도 — MALL_ID trim
  const mallIdTrimmed = process.env.CAFE24_MALL_ID?.trim();
  const tokenTrimmed = process.env.CAFE24_ACCESS_TOKEN?.trim();
  if (mallIdTrimmed && tokenTrimmed) {
    const url = `https://${mallIdTrimmed}.cafe24api.com/api/v2/admin/products?product_name=${encodeURIComponent(
      productName
    )}&limit=3`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenTrimmed}`,
          "Content-Type": "application/json",
          "X-Cafe24-Api-Version": "2024-12-01",
        },
      });
      const text = await res.text();
      result.envTokenTrimmedTest = {
        url,
        status: res.status,
        body: text.slice(0, 1500),
      };
    } catch (e) {
      result.envTokenTrimmedTest = { error: String(e) };
    }
  }

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

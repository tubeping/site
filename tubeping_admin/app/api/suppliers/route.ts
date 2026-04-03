import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/suppliers — 공급사 목록
 * POST /api/suppliers — 공급사 추가
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  const sb = getServiceClient();
  let query = sb
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ suppliers: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, contact_name, phone, business_no, memo } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "name, email 필수" }, { status: 400 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("suppliers")
    .insert({ name, email, contact_name, phone, business_no, memo })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ supplier: data });
}

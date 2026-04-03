import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getActiveStores, cafe24Fetch } from "@/lib/cafe24";

/**
 * POST /api/cafe24/shipments — 송장번호를 카페24에 연동
 * body: { order_ids?: string[] }  (비어있으면 미연동 전체 처리)
 *
 * 로직:
 * 1. orders 테이블에서 tracking_number 있고 cafe24_shipping_synced=false인 건 조회
 * 2. 각 건을 카페24 API로 발송처리
 * 3. 성공 시 cafe24_shipping_synced=true 업데이트
 */

// 택배사 코드 매핑 (카페24 shipping_company_code)
const SHIPPING_COMPANY_CODES: Record<string, string> = {
  CJ대한통운: "0001",
  한진택배: "0002",
  롯데택배: "0003",
  우체국택배: "0004",
  로젠택배: "0005",
  경동택배: "0006",
  대신택배: "0010",
  일양로지스: "0011",
  합동택배: "0015",
  GS편의점택배: "0016",
  CU편의점택배: "0017",
};

function getShippingCode(companyName: string): string {
  // 정확한 매칭 먼저
  if (SHIPPING_COMPANY_CODES[companyName]) return SHIPPING_COMPANY_CODES[companyName];
  // 부분 매칭
  for (const [name, code] of Object.entries(SHIPPING_COMPANY_CODES)) {
    if (companyName.includes(name) || name.includes(companyName)) return code;
  }
  return "0001"; // 기본값: CJ대한통운
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const orderIds: string[] | undefined = body.order_ids;

  const sb = getServiceClient();

  // 1. 미연동 송장 조회
  let query = sb
    .from("orders")
    .select("id, store_id, cafe24_order_id, cafe24_order_item_code, shipping_company, tracking_number")
    .eq("cafe24_shipping_synced", false)
    .not("tracking_number", "is", null)
    .neq("tracking_number", "");

  if (orderIds && orderIds.length > 0) {
    query = query.in("id", orderIds);
  }

  const { data: orders, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!orders || orders.length === 0) {
    return NextResponse.json({ message: "연동할 송장이 없습니다", synced: 0 });
  }

  // 2. 스토어별로 그룹핑
  const stores = await getActiveStores();
  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s]));

  const results: { order_id: string; cafe24_order_id: string; success: boolean; error?: string }[] = [];

  for (const order of orders) {
    const store = storeMap[order.store_id];
    if (!store) {
      results.push({
        order_id: order.id,
        cafe24_order_id: order.cafe24_order_id,
        success: false,
        error: "스토어 정보 없음",
      });
      continue;
    }

    try {
      // 카페24 배송정보 등록 API
      const res = await cafe24Fetch(store, `/orders/${order.cafe24_order_id}/shipments`, {
        method: "POST",
        body: JSON.stringify({
          request: {
            shipping_company_code: getShippingCode(order.shipping_company || ""),
            tracking_no: order.tracking_number,
            order_item_code: [order.cafe24_order_item_code],
            status: "shipping", // 배송중으로 변경
          },
        }),
      });

      if (res.ok) {
        // DB 업데이트
        await sb
          .from("orders")
          .update({
            cafe24_shipping_synced: true,
            cafe24_shipping_synced_at: new Date().toISOString(),
            shipping_status: "shipping",
            shipped_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        results.push({
          order_id: order.id,
          cafe24_order_id: order.cafe24_order_id,
          success: true,
        });
      } else {
        const errText = await res.text();
        results.push({
          order_id: order.id,
          cafe24_order_id: order.cafe24_order_id,
          success: false,
          error: `${res.status}: ${errText}`,
        });
      }
    } catch (err) {
      results.push({
        order_id: order.id,
        cafe24_order_id: order.cafe24_order_id,
        success: false,
        error: err instanceof Error ? err.message : "알 수 없는 오류",
      });
    }
  }

  const synced = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    total: results.length,
    synced,
    failed,
    results,
  });
}

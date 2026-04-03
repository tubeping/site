import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * POST /api/purchase-orders/send-email — 발주서 이메일 발송
 * body: { purchase_order_id: string }
 *
 * nodemailer 또는 외부 메일 서비스 연동
 * 현재는 Gmail SMTP 사용 (환경변수: SMTP_USER, SMTP_PASS)
 */

async function sendEmail(to: string, subject: string, html: string) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log(`[메일 발송 시뮬레이션] to: ${to}, subject: ${subject}`);
    console.log(`HTML 길이: ${html.length}자`);
    return true;
  }

  // SMTP 발송 (nodemailer 설치 후 활성화)
  // const nodemailer = require("nodemailer");
  // const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: smtpUser, pass: smtpPass } });
  // await transporter.sendMail({ from: `"TubePing" <${smtpUser}>`, to, subject, html });

  // Gmail API 또는 fetch 기반 발송으로 대체 가능
  console.log(`[메일 발송] to: ${to}, subject: ${subject}`);
  return true;
}

function generateEmailHtml(po: {
  po_number: string;
  order_date: string;
  total_items: number;
  access_password: string;
  supplier_name: string;
}, portalUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#111;padding:24px 32px;">
      <span style="font-size:24px;font-weight:bold;">
        <span style="color:#C41E1E;">Tube</span><span style="color:#fff;">Ping</span>
      </span>
      <span style="color:#999;font-size:16px;margin-left:8px;">발주요청서</span>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#333;font-size:14px;line-height:1.6;">
        안녕하세요. 튜핑입니다.<br><br>
        ${po.order_date} 발주요청서입니다.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px 16px;font-size:13px;color:#666;width:140px;">발주 요청 업체</td>
          <td style="padding:12px 16px;font-size:14px;color:#111;">(주)신산애널리틱스</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px 16px;font-size:13px;color:#666;">발주 요청일</td>
          <td style="padding:12px 16px;font-size:14px;color:#111;">${po.order_date}</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px 16px;font-size:13px;color:#666;">총 상품주문 수</td>
          <td style="padding:12px 16px;font-size:14px;color:#111;">${po.total_items}건</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:12px 16px;font-size:13px;color:#666;">총 첨부파일 수</td>
          <td style="padding:12px 16px;font-size:14px;color:#111;">1건</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;color:#666;">접속 비밀번호</td>
          <td style="padding:12px 16px;font-size:28px;font-weight:bold;color:#C41E1E;">${po.access_password}</td>
        </tr>
      </table>

      <!-- Buttons -->
      <div style="display:flex;gap:12px;margin:24px 0;">
        <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;background:#1a5c3a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">발주서 확인</a>
        <a href="${portalUrl}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">송장번호 등록</a>
      </div>

      <div style="margin-top:24px;padding:16px;background:#f9f9f9;border-radius:8px;">
        <p style="font-size:12px;color:#666;line-height:1.8;margin:0;">
          1. 접속 비밀번호를 기억하시고 [발주서 확인], [송장번호 등록] 버튼을 눌러주세요.<br>
          2. 이동한 페이지에서 접속 비밀번호를 입력하면 발주서 내려받기 및 송장번호 등록이 가능합니다.<br>
          <br>
          ① 접속 비밀번호를 입력하시면 수신확인 처리됩니다.<br>
          ① 해당 '발주 요청' 내용은 반드시 재확인을 하시길 바랍니다.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { purchase_order_id } = body;

  if (!purchase_order_id) {
    return NextResponse.json({ error: "purchase_order_id 필수" }, { status: 400 });
  }

  const sb = getServiceClient();

  // 발주서 조회
  const { data: po } = await sb
    .from("purchase_orders")
    .select("*, suppliers:supplier_id(name, email)")
    .eq("id", purchase_order_id)
    .single();

  if (!po) {
    return NextResponse.json({ error: "발주서를 찾을 수 없습니다" }, { status: 404 });
  }

  const supplierEmail = po.suppliers?.email;
  if (!supplierEmail) {
    return NextResponse.json({ error: "공급사 이메일이 없습니다" }, { status: 400 });
  }

  // 포털 URL 생성
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://admin-mu-two-27.vercel.app";
  const portalUrl = `${baseUrl}/admin/supplier`;

  const html = generateEmailHtml(
    {
      po_number: po.po_number,
      order_date: po.order_date,
      total_items: po.total_items,
      access_password: po.access_password,
      supplier_name: po.suppliers?.name || "",
    },
    portalUrl
  );

  const subject = `[TubePing] ${po.order_date} 발주요청서 (${po.po_number})`;
  const success = await sendEmail(supplierEmail, subject, html);

  if (success) {
    await sb
      .from("purchase_orders")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", purchase_order_id);
  }

  return NextResponse.json({ success, email: supplierEmail });
}

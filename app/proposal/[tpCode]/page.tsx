import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PrintButton from "./_components/PrintButton";

export const revalidate = 60;

type Props = { params: Promise<{ tpCode: string }> };

type Product = {
  id: string;
  tp_code: string;
  product_name: string;
  price: number;
  supply_price: number;
  retail_price: number | null;
  image_url: string | null;
  category: string | null;
  description: string | null;
  supplier: string | null;
  supply_shipping_fee: number;
  margin_rate: number | null;
  approval_status: string | null;
  display: string | null;
  selling: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tpCode } = await params;
  const { data } = await supabaseAdmin
    .from("products")
    .select("product_name, image_url")
    .eq("tp_code", tpCode)
    .maybeSingle();

  if (!data) return { title: "공구 제안서", robots: { index: false, follow: false } };
  return {
    title: `${data.product_name} — 공구 제안서 | TubePing`,
    description: "TubePing 크리에이터 공구 제안서",
    robots: { index: false, follow: false }, // 검색엔진 색인 차단
    openGraph: {
      title: `${data.product_name} — 공구 제안서`,
      images: data.image_url ? [data.image_url] : [],
    },
  };
}

function num(n: number): string {
  return n.toLocaleString("ko-KR");
}

export default async function ProposalPage({ params }: Props) {
  const { tpCode } = await params;
  const { data: p } = await supabaseAdmin
    .from("products")
    .select(
      "id, tp_code, product_name, price, supply_price, retail_price, image_url, category, description, supplier, supply_shipping_fee, margin_rate, approval_status, display, selling"
    )
    .eq("tp_code", tpCode)
    .maybeSingle();

  if (!p) notFound();
  const product = p as Product;

  // 비표시·미승인 상품은 노출하지 않음
  if (product.display !== "T" || product.approval_status !== "approved") notFound();

  const sellPrice = product.price || 0;
  const supplyPrice = product.supply_price || 0;
  // 크리에이터 예상 수익 = 판매가 - 공급가 (배송비/수수료는 별도)
  // 단, supply_price를 직접 표시하지 않고 마진만 표시
  const creatorMargin = Math.max(0, sellPrice - supplyPrice);
  const marginRate =
    product.margin_rate != null
      ? Number(product.margin_rate)
      : sellPrice > 0
      ? ((creatorMargin / sellPrice) * 100)
      : 0;

  // 수익 시뮬레이션 (50/100/300/500개)
  const simulations = [50, 100, 300, 500].map((qty) => ({
    qty,
    revenue: sellPrice * qty,
    margin: creatorMargin * qty,
  }));

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* 상단 헤더 (인쇄 시 숨김) */}
      <nav className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#F0F0F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-extrabold tracking-tight">
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-[#111111]">Ping</span>
          </Link>
          <div className="text-xs sm:text-sm text-[#999999]">공구 제안서</div>
        </div>
      </nav>

      <main className="pt-20 print:pt-0 pb-16 px-4 print:px-0">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl print:rounded-none print:shadow-none shadow-sm border border-[#F0F0F0] print:border-0 overflow-hidden">
          {/* 헤더 */}
          <div className="px-6 sm:px-10 pt-8 sm:pt-10 pb-6 border-b border-[#F0F0F0]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#FFF0F3] text-[#C41E1E] font-bold">
                공구 제안서
              </span>
              {product.category && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#666666] font-medium">
                  {product.category}
                </span>
              )}
              <span className="text-xs text-[#999999] font-mono ml-auto">{product.tp_code}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111111] leading-tight">
              {product.product_name}
            </h1>
          </div>

          <div className="grid md:grid-cols-2 gap-0 md:gap-8 px-6 sm:px-10 py-8">
            {/* 이미지 */}
            <div className="md:sticky md:top-24 self-start">
              {product.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={product.image_url}
                  alt={product.product_name}
                  className="w-full aspect-square object-cover rounded-xl bg-[#F9FAFB]"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-[#F9FAFB] flex items-center justify-center text-5xl">
                  📦
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="mt-8 md:mt-0">
              <div className="mb-8">
                <div className="text-sm text-[#666666] mb-1">권장 판매가</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#111111]">
                  ₩ {num(sellPrice)}
                </div>
              </div>

              <div className="space-y-4 p-5 bg-[#FFF8F8] rounded-xl border border-[#FFE0E0] mb-8">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-[#666666]">크리에이터 예상 마진율</span>
                  <span className="text-2xl font-extrabold text-[#C41E1E]">
                    {marginRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-[#FFE0E0]">
                  <span className="text-sm text-[#666666]">건당 예상 수익</span>
                  <span className="text-lg font-bold text-[#111111]">
                    ₩ {num(creatorMargin)}
                  </span>
                </div>
              </div>

              {/* 공급사 정보 */}
              {product.supplier && (
                <div className="mb-6 text-sm">
                  <span className="text-[#666666]">공급사: </span>
                  <span className="font-medium text-[#111111]">{product.supplier}</span>
                </div>
              )}

              {product.supply_shipping_fee !== undefined && (
                <div className="mb-6 text-sm">
                  <span className="text-[#666666]">배송비: </span>
                  <span className="font-medium text-[#111111]">
                    {product.supply_shipping_fee > 0 ? `₩ ${num(product.supply_shipping_fee)}` : "무료"}
                  </span>
                </div>
              )}

              {product.description && (
                <div className="mb-6">
                  <div className="text-sm text-[#666666] mb-2 font-medium">상품 설명</div>
                  <p className="text-sm text-[#333333] leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 수익 시뮬레이션 */}
          <div className="px-6 sm:px-10 py-8 bg-[#F9FAFB] print:bg-white border-t border-[#F0F0F0]">
            <h2 className="text-xl font-bold text-[#111111] mb-5">예상 수익 시뮬레이션</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {simulations.map((s) => (
                <div
                  key={s.qty}
                  className="bg-white rounded-xl p-4 sm:p-5 border border-[#F0F0F0] text-center"
                >
                  <div className="text-xs text-[#666666] mb-1">{s.qty}개 판매 시</div>
                  <div className="text-lg sm:text-xl font-extrabold text-[#C41E1E]">
                    ₩ {num(s.margin)}
                  </div>
                  <div className="text-xs text-[#999999] mt-1">
                    매출 ₩ {num(s.revenue)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#999999] mt-4">
              ※ 위 수익은 권장 판매가 기준 예상치이며, 실제 수익은 결제 수수료·배송비·반품률 등에 따라 달라질 수 있습니다.
            </p>
          </div>

          {/* CTA (인쇄 시 숨김) */}
          <div className="print:hidden px-6 sm:px-10 py-10 text-center border-t border-[#F0F0F0]">
            <h3 className="text-xl sm:text-2xl font-bold text-[#111111] mb-3">
              이 상품으로 공구를 시작해보세요
            </h3>
            <p className="text-[#666666] mb-6 text-sm sm:text-base">
              TubePing이 상품 소싱부터 배송·CS까지 전담합니다. 초기 투자비 0원.
            </p>
            <Link
              href="/#contact"
              className="inline-block bg-[#C41E1E] text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-full hover:bg-[#A01818] transition-all hover:shadow-lg hover:shadow-[#C41E1E]/20"
            >
              🚀 무료 입점 신청하기
            </Link>
          </div>

          {/* 푸터 메타 */}
          <div className="px-6 sm:px-10 py-5 bg-[#F9FAFB] print:bg-white border-t border-[#F0F0F0] text-xs text-[#999999] flex flex-wrap justify-between gap-2">
            <div>본 제안서는 TubePing(㈜신산애널리틱스)이 발행한 비공개 자료입니다.</div>
            <div>tubeping.site / 010-8550-4919</div>
          </div>
        </div>

        {/* 인쇄 버튼 (인쇄 시 숨김) */}
        <div className="print:hidden max-w-4xl mx-auto mt-6 flex flex-wrap gap-3 justify-end">
          <PrintButton />
        </div>
      </main>

      {/* 인쇄용 CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: white !important; }
              .print\\:hidden { display: none !important; }
              .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
              .print\\:pt-0 { padding-top: 0 !important; }
              .print\\:rounded-none { border-radius: 0 !important; }
              .print\\:shadow-none { box-shadow: none !important; }
              .print\\:border-0 { border-width: 0 !important; }
              .print\\:bg-white { background-color: white !important; }
            }
          `,
        }}
      />
    </div>
  );
}

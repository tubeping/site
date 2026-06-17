import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getCafe24MappingByProductId, buildCafe24ProductUrl, getCafe24ProductDetail } from "@/lib/cafe24";
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

  const sellPrice = product.price || 0; // 공구가
  const supplyPrice = product.supply_price || 0;
  // 정상가 = retail_price (없거나 0이면 공구가와 동일)
  const normalPrice =
    product.retail_price && product.retail_price > sellPrice
      ? product.retail_price
      : sellPrice;
  const hasDiscount = normalPrice > sellPrice;
  const discountRate = hasDiscount
    ? Math.round(((normalPrice - sellPrice) / normalPrice) * 100)
    : 0;

  // 공구 수수료 = 공구가 - 공급가 (크리에이터가 가져가는 금액)
  const creatorMargin = Math.max(0, sellPrice - supplyPrice);
  const marginRate =
    product.margin_rate != null
      ? Number(product.margin_rate)
      : sellPrice > 0
      ? (creatorMargin / sellPrice) * 100
      : 0;

  // 카페24 매핑에서 product_no 가져와서 상세 정보 fetch (admin DB READ ONLY + tubeping.com 본문)
  const cafe24Mapping = await getCafe24MappingByProductId(product.id);
  const cafe24Detail = cafe24Mapping?.cafe24_product_no
    ? await getCafe24ProductDetail(cafe24Mapping.cafe24_product_no)
    : { html: null, meta: null };

  const detailUrl = cafe24Detail.meta?.ogUrl
    || (cafe24Mapping?.cafe24_product_no
        ? buildCafe24ProductUrl(cafe24Mapping.cafe24_product_no)
        : null);
  const mainImage = cafe24Detail.meta?.ogImage || product.image_url;
  const features = "";
  // 카페24 본문 HTML — 자기 회사 자산이므로 직접 표시
  const detailHtml: string | null = cafe24Detail.html;

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
              {mainImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={mainImage}
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
              {/* 가격 (정상가 → 공구가 → 할인율) */}
              <div className="mb-8">
                {hasDiscount && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm text-[#999999]">정상가</span>
                    <span className="text-base text-[#999999] line-through">
                      ₩ {num(normalPrice)}
                    </span>
                  </div>
                )}
                <div className="text-sm text-[#666666] mb-1">공구가</div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#111111]">
                    ₩ {num(sellPrice)}
                  </div>
                  {hasDiscount && (
                    <span className="text-lg font-extrabold text-[#C41E1E]">
                      {discountRate}% 할인
                    </span>
                  )}
                </div>
              </div>

              {/* 공구 수수료 (= 크리에이터 수익) */}
              <div className="space-y-4 p-5 bg-[#FFF8F8] rounded-xl border border-[#FFE0E0] mb-8">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-[#666666]">크리에이터 수수료율</span>
                  <span className="text-2xl font-extrabold text-[#C41E1E]">
                    {marginRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-[#FFE0E0]">
                  <span className="text-sm text-[#666666]">건당 공구 수수료</span>
                  <span className="text-lg font-bold text-[#111111]">
                    ₩ {num(creatorMargin)}
                  </span>
                </div>
              </div>

              {/* 배송비 */}
              {product.supply_shipping_fee !== undefined && (
                <div className="mb-6 text-sm">
                  <span className="text-[#666666]">배송비: </span>
                  <span className="font-medium text-[#111111]">
                    {product.supply_shipping_fee > 0
                      ? `₩ ${num(product.supply_shipping_fee)}`
                      : "무료"}
                  </span>
                </div>
              )}

              {/* 상품 상세페이지 버튼 (큰 사이즈) */}
              {detailUrl && (
                <a
                  href={detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-2 bg-[#111111] text-white text-base font-bold px-6 py-3.5 rounded-xl hover:bg-[#333333] transition-colors mb-6"
                >
                  🔗 상품 상세 페이지에서 더 보기
                  <span className="text-sm font-normal opacity-80">↗</span>
                </a>
              )}
            </div>
          </div>

          {/* 특장점 (카페24 simple/summary description) */}
          {features && (
            <div className="px-6 sm:px-10 py-8 border-t border-[#F0F0F0]">
              <h2 className="text-xl font-bold text-[#111111] mb-4">상품 특장점</h2>
              <p className="text-sm sm:text-base text-[#333333] leading-relaxed whitespace-pre-wrap">
                {features}
              </p>
            </div>
          )}

          {/* 상품 설명 (admin description 우선, 없으면 카페24 description) */}
          {product.description && (
            <div className="px-6 sm:px-10 py-8 border-t border-[#F0F0F0]">
              <h2 className="text-xl font-bold text-[#111111] mb-4">상품 설명</h2>
              <p className="text-sm sm:text-base text-[#333333] leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}
          {detailHtml && (
            <div className="px-6 sm:px-10 py-8 border-t border-[#F0F0F0]">
              <h2 className="text-xl font-bold text-[#111111] mb-4">상품 상세 페이지</h2>
              <div
                className="cafe24-detail text-sm sm:text-base text-[#333333] leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:my-2 [&_img]:block [&_img]:mx-auto [&_p]:my-2 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#E5E7EB] [&_td]:p-2 [&_th]:border [&_th]:border-[#E5E7EB] [&_th]:p-2 [&_th]:bg-[#F9FAFB]"
                dangerouslySetInnerHTML={{ __html: detailHtml }}
              />
              <div className="mt-6 text-xs text-[#999999]">
                원본:{" "}
                {detailUrl && (
                  <a
                    href={detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C41E1E] hover:underline"
                  >
                    카페24 상세 페이지
                  </a>
                )}
              </div>
            </div>
          )}

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

/**
 * site_settings 테이블 전용 헬퍼.
 * admin DB 보호: 이 파일은 site_settings 테이블만 SELECT/UPDATE.
 * 다른 admin 테이블(products, stores 등) 절대 안 만짐.
 */
import { supabaseAdmin } from "./supabase-server";

export type ProposalTerms = {
  conditions: { label: string; value: string }[];
  settlement: { title: string; items: string[] };
  refund: {
    title: string;
    notice: string;
    deniedTitle: string;
    deniedList: string[];
  };
  cs: { title: string; items: string[] };
  simulationNote: string;
  cta: { title: string; subtitle: string; buttonLabel: string };
};

export const DEFAULT_PROPOSAL_TERMS: ProposalTerms = {
  conditions: [
    { label: "포장 상태", value: "공급사 표준 포장 (필요 시 아이스팩 포함)" },
    { label: "택배사", value: "CJ대한통운 (공급사에 따라 변경 가능)" },
    { label: "배송 기간", value: "공구 진행 다음날 출고 (영업일 기준 1~3일 이내 배송)" },
    { label: "반품 배송비", value: "왕복 8,000원 (단, 판매자 귀책 시 무료)" },
    { label: "판매 링크", value: "협의 (스마트스토어·SNS 마케팅 링크 등)" },
  ],
  settlement: {
    title: "정산 방법",
    items: [
      "공동구매 종료일로부터 **15일 이내 정산**",
      "**사업자**: 세금계산서 발행 → 판매 수수료 입금 (부가세 포함)",
      "**비사업자**: 3.3% 원천징수 후 입금",
    ],
  },
  refund: {
    title: "교환·반품 기준",
    notice: "※ 판매자 사유로 인한 경우 100% 교환·반품 가능",
    deniedTitle: "교환·반품 불가 사유",
    deniedList: [
      "반품 요청 기간 7일이 지난 경우",
      "구매자 책임 사유로 상품이 멸실·훼손된 경우",
      "구매자 책임 사유로 포장이 훼손되어 상품 가치가 현저히 상실된 경우",
      "구매자의 사용·일부 소비로 상품 가치가 현저히 감소한 경우",
      "시간 경과로 재판매가 곤란할 정도로 상품 가치가 감소한 경우",
    ],
  },
  cs: {
    title: "CS 응대",
    items: [
      "**TubePing 통합 CS팀**이 1:1 응대 (평일 10:00–18:00)",
      "카페24 1:1 문의·카카오톡 채널·이메일 채널 통합 운영",
      "배송·교환·환불 전 과정 TubePing이 책임",
      "크리에이터·구매자 모두 별도 응대 부담 없음",
    ],
  },
  simulationNote:
    "※ 위 수익은 권장 판매가 기준 예상치이며, 실제 수익은 결제 수수료·배송비·반품률 등에 따라 달라질 수 있습니다.",
  cta: {
    title: "이 상품으로 공구를 시작해보세요",
    subtitle: "TubePing이 상품 소싱부터 배송·CS까지 전담합니다. 초기 투자비 0원.",
    buttonLabel: "🚀 공구 신청하기",
  },
};

function mergeWithDefault(saved: Partial<ProposalTerms> | null | undefined): ProposalTerms {
  if (!saved || typeof saved !== "object") return DEFAULT_PROPOSAL_TERMS;
  return {
    conditions:
      Array.isArray(saved.conditions) && saved.conditions.length > 0
        ? saved.conditions
        : DEFAULT_PROPOSAL_TERMS.conditions,
    settlement: {
      title: saved.settlement?.title || DEFAULT_PROPOSAL_TERMS.settlement.title,
      items:
        Array.isArray(saved.settlement?.items) && saved.settlement.items.length > 0
          ? saved.settlement.items
          : DEFAULT_PROPOSAL_TERMS.settlement.items,
    },
    refund: {
      title: saved.refund?.title || DEFAULT_PROPOSAL_TERMS.refund.title,
      notice: saved.refund?.notice || DEFAULT_PROPOSAL_TERMS.refund.notice,
      deniedTitle: saved.refund?.deniedTitle || DEFAULT_PROPOSAL_TERMS.refund.deniedTitle,
      deniedList:
        Array.isArray(saved.refund?.deniedList) && saved.refund.deniedList.length > 0
          ? saved.refund.deniedList
          : DEFAULT_PROPOSAL_TERMS.refund.deniedList,
    },
    cs: {
      title: saved.cs?.title || DEFAULT_PROPOSAL_TERMS.cs.title,
      items:
        Array.isArray(saved.cs?.items) && saved.cs.items.length > 0
          ? saved.cs.items
          : DEFAULT_PROPOSAL_TERMS.cs.items,
    },
    simulationNote: saved.simulationNote || DEFAULT_PROPOSAL_TERMS.simulationNote,
    cta: {
      title: saved.cta?.title || DEFAULT_PROPOSAL_TERMS.cta.title,
      subtitle: saved.cta?.subtitle || DEFAULT_PROPOSAL_TERMS.cta.subtitle,
      buttonLabel: saved.cta?.buttonLabel || DEFAULT_PROPOSAL_TERMS.cta.buttonLabel,
    },
  };
}

let cache: { value: ProposalTerms; ts: number } | null = null;
const CACHE_TTL = 30 * 1000; // 30초

export async function getProposalTerms(): Promise<ProposalTerms> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.value;
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "proposal_terms")
    .maybeSingle();
  const merged = mergeWithDefault(data?.value as Partial<ProposalTerms>);
  cache = { value: merged, ts: Date.now() };
  return merged;
}

export async function saveProposalTerms(value: ProposalTerms): Promise<void> {
  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert(
      { key: "proposal_terms", value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) throw new Error(error.message);
  cache = null; // 즉시 무효화
}

/**
 * 마크다운 굵게(**...**)만 변환. 나머지 HTML 태그는 escape.
 * 정책 텍스트 표시용 — XSS 방지.
 */
export function renderTermsLine(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-[#111111]">$1</strong>');
}

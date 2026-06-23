import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookie, MANAGE_COOKIE_NAME } from "@/lib/manage-auth";
import { saveProposalTerms, DEFAULT_PROPOSAL_TERMS, ProposalTerms } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifySessionCookie(store.get(MANAGE_COOKIE_NAME)?.value);
}

function validate(body: unknown): ProposalTerms {
  // 안전한 머지 — 누락 필드는 기본값 사용, 배열/객체 타입만 통과
  const v = (body as Partial<ProposalTerms>) || {};
  return {
    conditions: Array.isArray(v.conditions)
      ? v.conditions
          .filter((c) => c && typeof c.label === "string" && typeof c.value === "string")
          .map((c) => ({ label: String(c.label).slice(0, 50), value: String(c.value).slice(0, 500) }))
      : DEFAULT_PROPOSAL_TERMS.conditions,
    settlement: {
      title: String(v.settlement?.title || DEFAULT_PROPOSAL_TERMS.settlement.title).slice(0, 50),
      items: Array.isArray(v.settlement?.items)
        ? v.settlement.items.filter((s) => typeof s === "string").map((s) => String(s).slice(0, 500))
        : DEFAULT_PROPOSAL_TERMS.settlement.items,
    },
    refund: {
      title: String(v.refund?.title || DEFAULT_PROPOSAL_TERMS.refund.title).slice(0, 50),
      notice: String(v.refund?.notice || DEFAULT_PROPOSAL_TERMS.refund.notice).slice(0, 500),
      deniedTitle: String(v.refund?.deniedTitle || DEFAULT_PROPOSAL_TERMS.refund.deniedTitle).slice(0, 50),
      deniedList: Array.isArray(v.refund?.deniedList)
        ? v.refund.deniedList.filter((s) => typeof s === "string").map((s) => String(s).slice(0, 500))
        : DEFAULT_PROPOSAL_TERMS.refund.deniedList,
    },
    cs: {
      title: String(v.cs?.title || DEFAULT_PROPOSAL_TERMS.cs.title).slice(0, 50),
      items: Array.isArray(v.cs?.items)
        ? v.cs.items.filter((s) => typeof s === "string").map((s) => String(s).slice(0, 500))
        : DEFAULT_PROPOSAL_TERMS.cs.items,
    },
    simulationNote: String(v.simulationNote || DEFAULT_PROPOSAL_TERMS.simulationNote).slice(0, 500),
    cta: {
      title: String(v.cta?.title || DEFAULT_PROPOSAL_TERMS.cta.title).slice(0, 100),
      subtitle: String(v.cta?.subtitle || DEFAULT_PROPOSAL_TERMS.cta.subtitle).slice(0, 200),
      buttonLabel: String(v.cta?.buttonLabel || DEFAULT_PROPOSAL_TERMS.cta.buttonLabel).slice(0, 50),
    },
  };
}

export async function POST(request: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const safe = validate(body);
  try {
    await saveProposalTerms(safe);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

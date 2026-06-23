"use client";

import { useState } from "react";
import type { ProposalTerms } from "@/lib/site-settings";

type Props = { initial: ProposalTerms };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[#F0F0F0] p-5 sm:p-6 mb-5">
      <h2 className="text-base font-bold text-[#111111] mb-4">{title}</h2>
      {children}
    </section>
  );
}

function TextRow({
  label,
  value,
  onChange,
  textarea,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs font-semibold text-[#666666] mb-1">{label}</label>}
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm text-[#111111] focus:border-[#C41E1E] focus:outline-none resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm text-[#111111] focus:border-[#C41E1E] focus:outline-none"
        />
      )}
    </div>
  );
}

function ListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  function update(i: number, v: string) {
    const next = [...items];
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, ""]);
  }
  return (
    <div className="space-y-2">
      {items.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={s}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm text-[#111111] focus:border-[#C41E1E] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="px-3 text-sm text-[#999999] hover:text-[#C41E1E] border border-[#E0E0E0] rounded-lg"
          >
            삭제
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-[#C41E1E] hover:underline font-semibold"
      >
        + 항목 추가
      </button>
    </div>
  );
}

export default function EditForm({ initial }: Props) {
  const [data, setData] = useState<ProposalTerms>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/manage/proposal-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage("저장 실패: " + (err?.error || res.status));
      } else {
        setMessage("✅ 저장 완료 — 모든 공구 제안서에 반영됨 (캐시 30초)");
      }
    } catch (e) {
      setMessage("네트워크 오류: " + String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* 공동구매 진행 조건 */}
      <Section title="공동구매 진행 조건 (표)">
        <div className="space-y-3">
          {data.conditions.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 items-start">
              <input
                type="text"
                value={c.label}
                onChange={(e) => {
                  const next = [...data.conditions];
                  next[i] = { ...next[i], label: e.target.value };
                  setData({ ...data, conditions: next });
                }}
                placeholder="항목명"
                className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm font-semibold focus:border-[#C41E1E] focus:outline-none"
              />
              <input
                type="text"
                value={c.value}
                onChange={(e) => {
                  const next = [...data.conditions];
                  next[i] = { ...next[i], value: e.target.value };
                  setData({ ...data, conditions: next });
                }}
                placeholder="내용"
                className="px-3 py-2 rounded-lg border border-[#E0E0E0] text-sm focus:border-[#C41E1E] focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setData({
                    ...data,
                    conditions: data.conditions.filter((_, idx) => idx !== i),
                  })
                }
                className="px-3 text-sm text-[#999999] hover:text-[#C41E1E] border border-[#E0E0E0] rounded-lg"
              >
                삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setData({ ...data, conditions: [...data.conditions, { label: "", value: "" }] })
            }
            className="text-sm text-[#C41E1E] hover:underline font-semibold"
          >
            + 항목 추가
          </button>
        </div>
      </Section>

      {/* 정산 */}
      <Section title="정산 방법">
        <TextRow
          label="섹션 제목"
          value={data.settlement.title}
          onChange={(v) => setData({ ...data, settlement: { ...data.settlement, title: v } })}
        />
        <label className="block text-xs font-semibold text-[#666666] mb-1">항목</label>
        <ListEditor
          items={data.settlement.items}
          onChange={(items) => setData({ ...data, settlement: { ...data.settlement, items } })}
          placeholder="예: 공동구매 종료일로부터 **15일 이내 정산**"
        />
      </Section>

      {/* 교환·반품 */}
      <Section title="교환·반품 기준">
        <TextRow
          label="섹션 제목"
          value={data.refund.title}
          onChange={(v) => setData({ ...data, refund: { ...data.refund, title: v } })}
        />
        <TextRow
          label="상단 안내문"
          value={data.refund.notice}
          onChange={(v) => setData({ ...data, refund: { ...data.refund, notice: v } })}
          textarea
        />
        <TextRow
          label="불가 사유 제목"
          value={data.refund.deniedTitle}
          onChange={(v) => setData({ ...data, refund: { ...data.refund, deniedTitle: v } })}
        />
        <label className="block text-xs font-semibold text-[#666666] mb-1">불가 사유 목록</label>
        <ListEditor
          items={data.refund.deniedList}
          onChange={(deniedList) => setData({ ...data, refund: { ...data.refund, deniedList } })}
          placeholder="사유"
        />
      </Section>

      {/* CS */}
      <Section title="CS 응대">
        <TextRow
          label="섹션 제목"
          value={data.cs.title}
          onChange={(v) => setData({ ...data, cs: { ...data.cs, title: v } })}
        />
        <label className="block text-xs font-semibold text-[#666666] mb-1">항목</label>
        <ListEditor
          items={data.cs.items}
          onChange={(items) => setData({ ...data, cs: { ...data.cs, items } })}
          placeholder="예: **TubePing 통합 CS팀**이 1:1 응대"
        />
      </Section>

      {/* 시뮬레이션 안내 */}
      <Section title="수익 시뮬레이션 안내문">
        <TextRow
          value={data.simulationNote}
          onChange={(v) => setData({ ...data, simulationNote: v })}
          textarea
        />
      </Section>

      {/* CTA */}
      <Section title="하단 CTA">
        <TextRow
          label="제목"
          value={data.cta.title}
          onChange={(v) => setData({ ...data, cta: { ...data.cta, title: v } })}
        />
        <TextRow
          label="부제"
          value={data.cta.subtitle}
          onChange={(v) => setData({ ...data, cta: { ...data.cta, subtitle: v } })}
          textarea
        />
        <TextRow
          label="버튼 텍스트"
          value={data.cta.buttonLabel}
          onChange={(v) => setData({ ...data, cta: { ...data.cta, buttonLabel: v } })}
        />
      </Section>

      {/* 저장 바 */}
      <div className="sticky bottom-4 mt-6">
        <div className="bg-white rounded-2xl border border-[#F0F0F0] shadow-lg p-4 flex items-center justify-between gap-4">
          <div className="text-sm">
            {message && <span className={message.startsWith("✅") ? "text-[#10B981]" : "text-[#C41E1E]"}>{message}</span>}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-[#C41E1E] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#A01818] transition-colors disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}

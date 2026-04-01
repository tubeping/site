"use client";

import { useState } from "react";

/* ── Color Tokens ── */
const BRAND_COLORS = [
  { token: "--primary", name: "브랜드 레드", value: "#C41E1E", tailwind: "bg-primary", desc: "CTA 버튼, 활성 메뉴, 로고 Tube" },
  { token: "--primary-hover", name: "브랜드 호버", value: "#A01818", tailwind: "bg-primary-hover", desc: "버튼 호버 상태" },
  { token: "--primary-light", name: "브랜드 라이트", value: "#FFF0F3", tailwind: "bg-primary-light", desc: "활성 메뉴 배경, 뱃지 배경" },
  { token: "--primary-dim", name: "브랜드 딤", value: "rgba(196,30,30,0.08)", tailwind: "bg-primary-dim", desc: "포커스 링, 미묘한 강조" },
];

const BG_COLORS = [
  { token: "--background", name: "배경", value: "#F7F7F8", tailwind: "bg-background", desc: "전체 페이지 배경" },
  { token: "--card", name: "카드", value: "#FFFFFF", tailwind: "bg-card", desc: "카드, 모달, 테이블 배경" },
];

const TEXT_COLORS = [
  { token: "--foreground", name: "텍스트 기본", value: "#111111", tailwind: "text-foreground", desc: "제목, 본문 텍스트" },
  { token: "--text-secondary", name: "텍스트 보조", value: "#666666", tailwind: "text-text-secondary", desc: "설명, 부제목" },
  { token: "--text-tertiary", name: "텍스트 3차", value: "#999999", tailwind: "text-text-tertiary", desc: "플레이스홀더, 비활성" },
];

const BORDER_COLORS = [
  { token: "--border", name: "테두리", value: "#F0F0F0", tailwind: "border-border", desc: "카드 구분선, 약한 테두리" },
  { token: "--border-strong", name: "테두리 강조", value: "#E0E0E0", tailwind: "border-border-strong", desc: "입력 필드, 강한 구분선" },
];

const SEMANTIC_COLORS = [
  { token: "--success", name: "성공", value: "#22C55E", bg: "#F0FDF4", desc: "완료, 판매중, 정산완료" },
  { token: "--warning", name: "경고", value: "#F59E0B", bg: "#FFFBEB", desc: "배송중, 품절임박, 중간 우선순위" },
  { token: "--error", name: "에러", value: "#EF4444", bg: "#FEF2F2", desc: "품절, 높은 우선순위, 삭제" },
  { token: "--info", name: "정보", value: "#3B82F6", bg: "#EFF6FF", desc: "발주완료, 진행중, 링크" },
];

/* ── Typography ── */
const TYPOGRAPHY = [
  { name: "페이지 제목", size: "24px", weight: "700 (Bold)", class: "text-2xl font-bold", sample: "대시보드" },
  { name: "섹션 제목", size: "18px", weight: "700 (Bold)", class: "text-lg font-semibold", sample: "최근 발주" },
  { name: "본문", size: "15px", weight: "400 (Regular)", class: "text-sm", sample: "상품을 등록하고 관리합니다." },
  { name: "보조 텍스트", size: "13px", weight: "400 (Regular)", class: "text-xs", sample: "2026-04-01" },
  { name: "라벨/뱃지", size: "11px", weight: "700 (Bold)", class: "text-[11px] font-bold", sample: "ADMIN" },
];

/* ── Filter Chip ── */
function FilterChipDemo() {
  const [active, setActive] = useState("전체");
  const chips = ["전체", "판매중", "품절임박", "품절"];

  return (
    <div className="flex gap-2">
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => setActive(chip)}
          className="cursor-pointer transition-all"
          style={{
            padding: "6px 16px",
            borderRadius: "100px",
            fontSize: "13px",
            border: active === chip ? "1.5px solid #C41E1E" : "1.5px solid #E0E0E0",
            background: active === chip ? "#FFF0F3" : "transparent",
            color: active === chip ? "#C41E1E" : "#555",
            fontWeight: active === chip ? 700 : 400,
          }}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

/* ── Color Swatch ── */
function Swatch({ value, name, token, desc }: { value: string; name: string; token: string; desc: string }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div
        className="w-12 h-12 rounded-lg border border-gray-200 shrink-0"
        style={{ background: value }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <code className="text-[11px] text-text-tertiary bg-gray-100 px-1.5 py-0.5 rounded font-mono">{token}</code>
        </div>
        <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
      </div>
      <code className="text-xs text-text-secondary font-mono shrink-0">{value}</code>
    </div>
  );
}

/* ── Section ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">{title}</h2>
      {children}
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">TP</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">TubePing 디자인 시스템</h1>
            <p className="text-sm text-text-secondary">어드민 허브 UI 규칙 및 디자인 토큰 가이드</p>
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <Section title="색상 토큰 — 브랜드">
        <div className="bg-card rounded-xl border border-border p-5 divide-y divide-border">
          {BRAND_COLORS.map((c) => (
            <Swatch key={c.token} value={c.value} name={c.name} token={c.token} desc={c.desc} />
          ))}
        </div>
      </Section>

      {/* Background */}
      <Section title="색상 토큰 — 배경">
        <div className="bg-card rounded-xl border border-border p-5 divide-y divide-border">
          {BG_COLORS.map((c) => (
            <Swatch key={c.token} value={c.value} name={c.name} token={c.token} desc={c.desc} />
          ))}
        </div>
      </Section>

      {/* Text */}
      <Section title="색상 토큰 — 텍스트">
        <div className="bg-card rounded-xl border border-border p-5 divide-y divide-border">
          {TEXT_COLORS.map((c) => (
            <Swatch key={c.token} value={c.value} name={c.name} token={c.token} desc={c.desc} />
          ))}
        </div>
      </Section>

      {/* Border */}
      <Section title="색상 토큰 — 테두리">
        <div className="bg-card rounded-xl border border-border p-5 divide-y divide-border">
          {BORDER_COLORS.map((c) => (
            <Swatch key={c.token} value={c.value} name={c.name} token={c.token} desc={c.desc} />
          ))}
        </div>
      </Section>

      {/* Semantic */}
      <Section title="색상 토큰 — 시맨틱 (상태)">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="grid grid-cols-4 gap-4">
            {SEMANTIC_COLORS.map((c) => (
              <div key={c.token} className="text-center">
                <div className="flex gap-1 mb-2 justify-center">
                  <div className="w-10 h-10 rounded-lg border border-gray-200" style={{ background: c.value }} />
                  <div className="w-10 h-10 rounded-lg border border-gray-200" style={{ background: c.bg }} />
                </div>
                <p className="text-xs font-semibold text-foreground">{c.name}</p>
                <code className="text-[10px] text-text-tertiary font-mono">{c.value}</code>
                <p className="text-[10px] text-text-secondary mt-1">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section title="타이포그래피">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-text-secondary border-b border-border">
                <th className="text-left px-5 py-3 font-medium">용도</th>
                <th className="text-left px-3 py-3 font-medium">크기</th>
                <th className="text-left px-3 py-3 font-medium">굵기</th>
                <th className="text-left px-3 py-3 font-medium">Tailwind</th>
                <th className="text-left px-5 py-3 font-medium">샘플</th>
              </tr>
            </thead>
            <tbody>
              {TYPOGRAPHY.map((t) => (
                <tr key={t.name} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-sm font-medium text-foreground">{t.name}</td>
                  <td className="px-3 py-3 text-xs text-text-secondary font-mono">{t.size}</td>
                  <td className="px-3 py-3 text-xs text-text-secondary">{t.weight}</td>
                  <td className="px-3 py-3"><code className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-text-tertiary">{t.class}</code></td>
                  <td className="px-5 py-3">
                    <span style={{ fontSize: t.size, fontWeight: t.weight.startsWith("700") ? 700 : 400 }}>
                      {t.sample}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-tertiary mt-2">
          fontSize 5종(11/13/15/18/24)만 사용. fontWeight 400/700 2단계만.
        </p>
      </Section>

      {/* Filter Chips */}
      <Section title="필터 칩 표준">
        <div className="bg-card rounded-xl border border-border p-6">
          <FilterChipDemo />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary-light border border-primary/20">
              <p className="text-xs font-bold text-primary mb-2">활성 (Active)</p>
              <ul className="text-xs text-text-secondary space-y-1">
                <li>border: 1.5px solid #C41E1E</li>
                <li>background: #FFF0F3</li>
                <li>color: #C41E1E</li>
                <li>fontWeight: 700</li>
                <li>borderRadius: 100px</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-border-strong">
              <p className="text-xs font-bold text-foreground mb-2">비활성 (Inactive)</p>
              <ul className="text-xs text-text-secondary space-y-1">
                <li>border: 1.5px solid #E0E0E0</li>
                <li>background: transparent</li>
                <li>color: #555555</li>
                <li>fontWeight: 400</li>
                <li>borderRadius: 100px</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Status Badges */}
      <Section title="상태 뱃지">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex flex-wrap gap-3">
            {[
              { label: "판매중", cls: "bg-success-light text-success" },
              { label: "발주완료", cls: "bg-info-light text-info" },
              { label: "배송중", cls: "bg-warning-light text-warning" },
              { label: "정산대기", cls: "bg-warning-light text-warning" },
              { label: "품절임박", cls: "bg-error-light text-error" },
              { label: "품절", cls: "bg-error-light text-error" },
              { label: "배송완료", cls: "bg-success-light text-success" },
              { label: "정산완료", cls: "bg-gray-100 text-gray-500" },
              { label: "초안", cls: "bg-gray-100 text-gray-600" },
              { label: "검토중", cls: "bg-warning-light text-warning" },
              { label: "발행됨", cls: "bg-success-light text-success" },
            ].map((b) => (
              <span key={b.label} className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-4">
            모든 뱃지는 text-xs font-medium px-2.5 py-1 rounded-full 통일.
          </p>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="버튼">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <button className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors cursor-pointer">
              + 새 항목
            </button>
            <button className="px-4 py-2.5 bg-card text-foreground text-sm font-medium rounded-lg border border-border-strong hover:bg-gray-50 transition-colors cursor-pointer">
              취소
            </button>
            <button className="px-4 py-2.5 bg-card text-error text-sm font-medium rounded-lg border border-error/30 hover:bg-error-light transition-colors cursor-pointer">
              삭제
            </button>
            <button className="px-4 py-2.5 bg-gray-100 text-text-tertiary text-sm font-medium rounded-lg cursor-not-allowed" disabled>
              비활성
            </button>
          </div>
          <div className="text-xs text-text-secondary space-y-1">
            <p><strong>Primary:</strong> bg-primary text-white → hover:bg-primary-hover</p>
            <p><strong>Secondary:</strong> bg-card border border-border-strong → hover:bg-gray-50</p>
            <p><strong>Danger:</strong> text-error border border-error/30 → hover:bg-error-light</p>
            <p><strong>공통:</strong> px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer</p>
          </div>
        </div>
      </Section>

      {/* Card */}
      <Section title="카드 / 패널">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-xs text-text-secondary">기본 카드</p>
              <p className="text-lg font-bold text-foreground mt-1">₩4,520,000</p>
              <p className="text-xs text-success font-medium mt-2">+12% vs 지난달</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
              <p className="text-xs text-text-secondary">호버 카드</p>
              <p className="text-lg font-bold text-foreground mt-1">326건</p>
              <p className="text-xs text-error font-medium mt-2">-3% vs 지난달</p>
            </div>
          </div>
          <div className="text-xs text-text-secondary space-y-1">
            <p><strong>스타일:</strong> bg-card rounded-xl border border-border p-5</p>
            <p><strong>호버:</strong> hover:shadow-sm transition-shadow (선택)</p>
            <p><strong>섹션 구분:</strong> border-b border-border (회색 띠 금지)</p>
          </div>
        </div>
      </Section>

      {/* Input */}
      <Section title="입력 필드">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              className="w-72 px-4 py-2.5 text-sm border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-dim focus:border-primary"
            />
            <select className="px-4 py-2.5 text-sm border border-border-strong rounded-lg text-text-secondary focus:outline-none cursor-pointer">
              <option>전체 카테고리</option>
            </select>
          </div>
          <div className="text-xs text-text-secondary space-y-1">
            <p><strong>기본:</strong> px-4 py-2.5 text-sm border border-border-strong rounded-lg</p>
            <p><strong>포커스:</strong> focus:ring-2 focus:ring-primary-dim focus:border-primary</p>
            <p><strong>플레이스홀더:</strong> text-text-tertiary (자동)</p>
          </div>
        </div>
      </Section>

      {/* Layout Rules */}
      <Section title="영역별 스타일 규칙">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-text-secondary border-b border-border">
                <th className="text-left px-5 py-3 font-medium">영역</th>
                <th className="text-left px-3 py-3 font-medium">스타일 방식</th>
                <th className="text-left px-5 py-3 font-medium">레이아웃</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-border">
                <td className="px-5 py-3 font-medium text-foreground">어드민 페이지</td>
                <td className="px-3 py-3 text-text-secondary">Tailwind className만</td>
                <td className="px-5 py-3 text-text-secondary">사이드바(260px) + 메인 영역</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-5 py-3 font-medium text-foreground">빌더 (고객용)</td>
                <td className="px-3 py-3 text-text-secondary">Tailwind className</td>
                <td className="px-5 py-3 text-text-secondary">max-w-3xl mx-auto</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-5 py-3 font-medium text-foreground">타이포</td>
                <td className="px-3 py-3 text-text-secondary" colSpan={2}>fontSize 5종(11/13/15/18/24), fontWeight 400/700 2단계만</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-5 py-3 font-medium text-foreground">아이콘</td>
                <td className="px-3 py-3 text-text-secondary" colSpan={2}>인라인 SVG (w-5 h-5 통일) — 추후 아이콘 컴포넌트 전환 예정</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-foreground">섹션 구분</td>
                <td className="px-3 py-3 text-text-secondary" colSpan={2}>border-b border-border 사용. 회색 띠/배경 구분 금지</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Logo */}
      <Section title="로고 규칙">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-8 mb-4">
            <div className="text-center">
              <span className="text-3xl font-extrabold">
                <span className="text-primary">Tube</span>
                <span className="text-foreground">Ping</span>
              </span>
              <p className="text-xs text-text-tertiary mt-2">기본 로고</p>
            </div>
            <div className="text-center bg-foreground rounded-lg px-6 py-4">
              <span className="text-3xl font-extrabold">
                <span className="text-primary">Tube</span>
                <span className="text-white">Ping</span>
              </span>
              <p className="text-xs text-gray-400 mt-2">다크 배경</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-sm">TP</span>
              </div>
              <p className="text-xs text-text-tertiary mt-2">아이콘</p>
            </div>
          </div>
          <div className="text-xs text-text-secondary space-y-1">
            <p><strong>Tube</strong> = #C41E1E (항상 빨간색)</p>
            <p><strong>Ping</strong> = #111111 (밝은 배경) / #FFFFFF (어두운 배경)</p>
            <p>두 단어 사이 공백 없음. font-extrabold 고정.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

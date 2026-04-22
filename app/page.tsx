"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ─────────────── Data ─────────────── */

const NAV_LINKS = [
  { label: "서비스", href: "#services" },
  { label: "프로세스", href: "#process" },
  { label: "수익구조", href: "#revenue" },
  { label: "파트너", href: "#partners" },
  { label: "블로그", href: "/blog" },
  { label: "문의", href: "#contact" },
];

const PROBLEMS = [
  {
    icon: "🎬",
    title: "채널 운영만으로도 벅찬데",
    desc: "촬영, 편집, 기획까지… 쇼핑은 언제 하죠?",
  },
  {
    icon: "📦",
    title: "상품 소싱 경험 부족",
    desc: "어디서, 어떤 상품을, 얼마에 가져와야 하는지 모릅니다.",
  },
  {
    icon: "🚚",
    title: "물류·배송·CS 운영 어려움",
    desc: "재고 관리, 배송 추적, 교환/환불… 혼자 감당 불가.",
  },
  {
    icon: "💸",
    title: "초기 투자 리스크",
    desc: "재고를 사놓고 안 팔리면? 리스크를 감수하기 어렵습니다.",
  },
];

const PROCESS_STEPS = [
  { num: "01", title: "상품 소싱", desc: "트렌드 분석 기반 최적 상품 발굴", icon: "🔍" },
  { num: "02", title: "쇼핑몰 구축", desc: "채널 맞춤 브랜드 쇼핑몰 개설", icon: "🏪" },
  { num: "03", title: "콘텐츠 연동", desc: "영상 ↔ 쇼핑몰 자동 연결", icon: "🔗" },
  { num: "04", title: "배송 · CS", desc: "주문~배송~교환/환불 전담", icon: "🚚" },
  { num: "05", title: "판매 · 마케팅", desc: "데이터 기반 매출 극대화", icon: "📣" },
  { num: "06", title: "수익 정산", desc: "투명한 실시간 정산 시스템", icon: "💰" },
];

const SERVICES = [
  {
    icon: "🛒",
    title: "상품 소싱 · 제작",
    desc: "네이버 트렌드 + 셀러라이프 데이터를 분석해 채널에 딱 맞는 상품을 추천합니다. OEM/ODM 제작도 지원.",
    features: ["AI 트렌드 분석", "채널 맞춤 추천", "OEM/ODM 지원"],
  },
  {
    icon: "🏪",
    title: "쇼핑몰 구축 · 운영",
    desc: "카페24 기반 쇼핑몰을 무료로 만들어드립니다. 디자인부터 상품 등록까지 원스톱.",
    features: ["무료 쇼핑몰 개설", "브랜드 커스터마이징", "상품 자동 등록"],
  },
  {
    icon: "🚚",
    title: "배송 · CS 전담",
    desc: "주문 접수부터 배송, 교환/환불까지. 크리에이터는 신경 쓸 필요 없습니다.",
    features: ["당일 출고 시스템", "CS 전담팀 운영", "실시간 배송 추적"],
  },
  {
    icon: "📣",
    title: "판매 · 마케팅",
    desc: "SEO 블로그, 숏폼 콘텐츠, SNS 마케팅까지. 데이터 기반으로 매출을 올립니다.",
    features: ["SEO 블로그 자동화", "숏폼 콘텐츠 제작", "퍼포먼스 마케팅"],
  },
];

const REVENUE_STEPS = [
  {
    step: "STEP 1",
    title: "채널 분석",
    desc: "구독자, 조회수, 카테고리를 분석해 최적 상품군을 도출합니다.",
  },
  {
    step: "STEP 2",
    title: "쇼핑몰 개설",
    desc: "분석 결과를 바탕으로 맞춤형 쇼핑몰을 무료로 구축합니다.",
  },
  {
    step: "STEP 3",
    title: "수익 창출",
    desc: "판매 수익을 투명하게 정산. 초기 비용 없이 수익만 가져가세요.",
  },
];

/* 파트너 카드에 노출되는 채널만 (운영 활발한 채널) */
const PARTNERS = [
  { name: "누기", subs: "130만", img: "/partners/누기_39만.jpg" },
  { name: "코믹마트", subs: "101만", img: "/partners/코믹마트.jpg" },
  { name: "이트랜드", subs: "71.7만", img: "/partners/E트렌드_71.6만.jpg" },
  { name: "떠먹여주는TV", subs: "68만", img: "/partners/떠먹여주는tv_68만.jpg" },
  { name: "편들어주는 파생방송", subs: "65만", img: "/partners/파생방송_65만.jpg" },
  { name: "킬링타임", subs: "54.5만", img: "/partners/킬링타.jpg" },
  { name: "줌인센타", subs: "53만", img: "/partners/줌인센타_53만.jpg" },
  { name: "뉴스반장", subs: "51만", img: "/partners/뉴스반장51만.jpg" },
  { name: "뉴스엔진", subs: "35만", img: "/partners/뉴스엔진_34.6만.jpg" },
  { name: "빵시기TV", subs: "35만", img: "/partners/빵시기TV_35만.jpg" },
  { name: "완선부부", subs: "6.6만", img: "/partners/완선부부_6.6만.jpg" },
  { name: "Artube", subs: "4.6만", img: "/partners/Artube_4.6만.jpg" },
];

const INFLUENCER_TYPES = [
  "유튜버",
  "인스타그래머",
  "틱톡커",
  "블로거",
  "기타",
];

const CONTACTS = [
  { role: "대표", name: "최준", phone: "010-8550-4919" },
  { role: "이사", name: "김국태", phone: "010-7373-6734" },
];

/* 카운트에는 비노출 채널(13~23번) 포함한 전체 수치 반영 */
const HERO_STATS = [
  { end: 23, suffix: "+", label: "파트너 유튜버", duration: 1500 },
  { end: 1000, suffix: "만+", label: "누적 구독자", duration: 2000 },
  { end: 0, suffix: "원", label: "초기 투자비", duration: 500 },
];

/* ─────────────── Hooks ─────────────── */

function useCountUp(end: number, duration: number, startCounting: boolean) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startCounting) return;
    if (end === 0) {
      setCount(0);
      return;
    }

    let start = 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart for a punchy counting feel
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(eased * end);

      if (current !== start) {
        start = current;
        setCount(current);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, startCounting]);

  return count;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ─────────────── Components ─────────────── */

function CountUpStat({
  end,
  suffix,
  label,
  duration,
  startCounting,
}: {
  end: number;
  suffix: string;
  label: string;
  duration: number;
  startCounting: boolean;
}) {
  const count = useCountUp(end, duration, startCounting);

  return (
    <div className="text-center">
      <div className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#C41E1E] whitespace-nowrap">
        {end === 0 ? "0" : count.toLocaleString()}
        <span className="text-4xl sm:text-5xl lg:text-6xl">{suffix}</span>
      </div>
      <div className="text-[#666666] mt-3 text-base sm:text-lg lg:text-xl">{label}</div>
    </div>
  );
}

function StatSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex justify-between max-w-4xl mx-auto mt-16 px-4"
    >
      {HERO_STATS.map((stat) => (
        <CountUpStat key={stat.label} {...stat} startCounting={visible} />
      ))}
    </div>
  );
}

function PartnerCard({ partner: p }: { partner: (typeof PARTNERS)[number] }) {
  return (
    <div className="flex-shrink-0 w-44 sm:w-52 bg-white rounded-2xl p-5 sm:p-7 border border-[#F0F0F0] text-center hover:shadow-lg transition-all">
      <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-[#111111] flex items-center justify-center mb-4 overflow-hidden">
        {p.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white text-2xl sm:text-3xl font-bold">
            {p.name[0]}
          </span>
        )}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-[#111111] truncate">
        {p.name}
      </h3>
      <span className="inline-block mt-2 text-sm bg-[#FFF0F3] text-[#C41E1E] font-bold px-3 py-1 rounded-full">
        구독자 {p.subs}
      </span>
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = useCallback((href: string) => {
    setMobileMenuOpen(false);
    if (href.startsWith("/")) {
      router.push(href);
      return;
    }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [router]);

  /* Reveal refs for each section */
  const problemRef = useReveal();
  const processRef = useReveal();
  const servicesRef = useReveal();
  const revenueRef = useReveal();
  const partnersRef = useReveal();
  const contactRef = useReveal();

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F0F0F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-2xl font-extrabold tracking-tight cursor-pointer"
          >
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-[#111111]">Ping</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-base text-[#666666] hover:text-[#111111] transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("#contact")}
              className="bg-[#C41E1E] text-white text-base font-semibold px-6 py-2.5 rounded-full hover:bg-[#A01818] transition-colors cursor-pointer"
            >
              시작하기
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 cursor-pointer"
            aria-label="메뉴"
          >
            <svg
              className="w-6 h-6 text-[#111111]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#F0F0F0] px-4 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="block w-full text-left text-base text-[#666666] hover:text-[#111111] py-2 cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("#contact")}
              className="w-full bg-[#C41E1E] text-white font-semibold py-3 rounded-xl hover:bg-[#A01818] transition-colors cursor-pointer"
            >
              시작하기
            </button>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 bg-gradient-to-b from-[#FFF8F8] to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-[#C41E1E]/10 text-[#C41E1E] text-sm sm:text-base font-bold px-5 py-2 rounded-full mb-6 animate-fade-up">
            SNS 커머스 FULFILLMENT 서비스
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-extrabold text-[#111111] leading-tight animate-fade-up delay-100">
            콘텐츠에만 집중하세요.
            <br />
            쇼핑 사업은{" "}
            <span className="text-[#C41E1E]">TUBEPING</span>이 합니다.
          </h1>
          <p className="text-[#666666] text-lg sm:text-xl mt-6 max-w-2xl mx-auto animate-fade-up delay-200 leading-relaxed">
            인플루언서가 콘텐츠 제작에 집중하면서도 직접 쇼핑 사업을 영위할 수
            있도록, 상품 소싱부터 배송·CS까지 필요한 모든 것을 제공합니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 animate-fade-up delay-300">
            <button
              onClick={() => scrollTo("#contact")}
              className="bg-[#C41E1E] text-white font-bold text-lg sm:text-xl px-10 py-4 sm:py-5 rounded-full hover:bg-[#A01818] transition-all hover:shadow-lg hover:shadow-[#C41E1E]/20 cursor-pointer"
            >
              🚀 지금 시작하기
            </button>
            <button
              onClick={() => scrollTo("#services")}
              className="border-2 border-[#E0E0E0] text-[#111111] font-semibold text-lg sm:text-xl px-10 py-4 sm:py-5 rounded-full hover:border-[#111111] transition-all cursor-pointer"
            >
              서비스 알아보기 →
            </button>
          </div>

          {/* Count-up stats */}
          <StatSection />
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section className="py-16 sm:py-24 px-4 bg-[#F9FAFB]">
        <div ref={problemRef} className="reveal max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111]">
              유튜버가 쇼핑 사업을 못하는 이유
            </h2>
            <p className="text-[#666666] mt-3 text-base sm:text-lg">
              크리에이터에게 커머스는 진입장벽이 너무 높습니다.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROBLEMS.map((p, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-[#F0F0F0] hover:border-[#C41E1E]/30 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-4 animate-float" style={{ animationDelay: `${i * 200}ms` }}>
                  {p.icon}
                </div>
                <h3 className="text-xl font-bold text-[#111111] mb-2">{p.title}</h3>
                <p className="text-base text-[#666666] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Process ─── */}
      <section id="process" className="py-16 sm:py-24 px-4">
        <div ref={processRef} className="reveal max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111]">
              TUBEPING이 <span className="text-[#C41E1E]">전부</span> 해결합니다
            </h2>
            <p className="text-[#666666] mt-3 text-base sm:text-lg">
              상품 발굴부터 정산까지, 6단계 원스톱 프로세스
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {PROCESS_STEPS.map((step, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-[#FFF0F3] rounded-2xl flex items-center justify-center text-2xl sm:text-3xl group-hover:bg-[#C41E1E] group-hover:scale-110 transition-all">
                  <span className="group-hover:scale-110 transition-transform">
                    {step.icon}
                  </span>
                </div>
                <div className="text-xs text-[#C41E1E] font-bold mt-3">
                  {step.num}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#111111] mt-1">
                  {step.title}
                </h3>
                <p className="text-sm text-[#666666] mt-1 hidden sm:block">
                  {step.desc}
                </p>
                {/* Arrow between steps */}
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 text-[#D1D5DB]">
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section id="services" className="py-16 sm:py-24 px-4 bg-[#F9FAFB]">
        <div ref={servicesRef} className="reveal max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111]">
              핵심 서비스
            </h2>
            <p className="text-[#666666] mt-3 text-base sm:text-lg">
              크리에이터 커머스에 필요한 모든 것
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-[#F0F0F0] hover:border-[#C41E1E]/30 hover:shadow-xl transition-all group"
              >
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#111111] mb-2 group-hover:text-[#C41E1E] transition-colors">
                  {s.title}
                </h3>
                <p className="text-base text-[#666666] leading-relaxed mb-4">
                  {s.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {s.features.map((f) => (
                    <span
                      key={f}
                      className="text-sm bg-[#FFF0F3] text-[#C41E1E] px-3 py-1.5 rounded-full font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Revenue ─── */}
      <section id="revenue" className="py-16 sm:py-24 px-4">
        <div ref={revenueRef} className="reveal max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111]">
              투자비{" "}
              <span className="text-[#C41E1E] text-4xl sm:text-6xl lg:text-7xl">₩0</span>
              으로 시작
            </h2>
            <p className="text-[#666666] mt-3 text-base sm:text-lg">
              리스크 없는 수익 구조. 팔린 만큼만 정산합니다.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {REVENUE_STEPS.map((r, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 mx-auto bg-[#C41E1E] text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {i + 1}
                </div>
                <div className="text-sm text-[#C41E1E] font-bold">{r.step}</div>
                <h3 className="text-xl font-bold text-[#111111] mt-1 mb-2">
                  {r.title}
                </h3>
                <p className="text-base text-[#666666] leading-relaxed">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Partners (auto-slide) ─── */}
      <section id="partners" className="py-16 sm:py-24 bg-[#F9FAFB]">
        <div ref={partnersRef} className="reveal">
          <div className="text-center mb-12 sm:mb-16 px-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111]">
              함께하는 파트너
            </h2>
            <p className="text-[#666666] mt-3 text-base sm:text-lg">
              이미 많은 크리에이터가 TUBEPING과 함께하고 있습니다.
            </p>
          </div>

          <div className="max-w-6xl mx-auto px-4 overflow-hidden">
            <div className="marquee-wrapper">
              <div className="marquee flex w-max gap-5 sm:gap-8">
                {[...PARTNERS, ...PARTNERS].map((p, i) => (
                  <PartnerCard key={`slide-${i}`} partner={p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contact / 입점 신청 ─── */}
      <section id="contact" className="py-16 sm:py-24 px-4">
        <div ref={contactRef} className="reveal max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111]">
              입점 신청하기
            </h2>
            <p className="text-[#666666] text-base sm:text-lg mt-3">
              아래 정보를 입력해주시면 담당자가 빠르게 연락드립니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* 입점 신청 폼 */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const data = Object.fromEntries(fd.entries());

                const btn = form.querySelector("button[type=submit]") as HTMLButtonElement;
                btn.disabled = true;
                btn.textContent = "신청 중...";

                try {
                  const res = await fetch("/api/apply", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });

                  if (res.ok) {
                    alert("입점 신청이 완료되었습니다!\n담당자가 빠르게 연락드리겠습니다.");
                    form.reset();
                  } else {
                    const err = await res.json();
                    alert(err.error || "신청 중 오류가 발생했습니다.");
                  }
                } catch {
                  alert("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                } finally {
                  btn.disabled = false;
                  btn.textContent = "🚀 입점 신청하기";
                }
              }}
              className="lg:col-span-3 bg-white rounded-2xl p-6 sm:p-10 border border-[#F0F0F0] shadow-sm space-y-6"
            >
              {/* 인플루언서 유형 */}
              <div>
                <label className="block text-base font-bold text-[#111111] mb-2">
                  인플루언서 유형
                </label>
                <div className="flex flex-wrap gap-3">
                  {INFLUENCER_TYPES.map((type) => (
                    <label key={type} className="cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={type}
                        required
                        className="peer hidden"
                      />
                      <span className="inline-block px-5 py-2.5 rounded-full border-2 border-[#E0E0E0] text-base text-[#666666] font-medium peer-checked:border-[#C41E1E] peer-checked:bg-[#FFF0F3] peer-checked:text-[#C41E1E] transition-all hover:border-[#C41E1E]/50">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 채널명 */}
              <div>
                <label htmlFor="channel" className="block text-base font-bold text-[#111111] mb-2">
                  채널명
                </label>
                <input
                  type="text"
                  id="channel"
                  name="channel"
                  required
                  placeholder="채널명을 입력해주세요"
                  className="w-full px-5 py-3.5 rounded-xl border-2 border-[#E0E0E0] text-base text-[#111111] placeholder:text-[#999999] focus:border-[#C41E1E] focus:outline-none transition-colors"
                />
              </div>

              {/* 구독자 수 */}
              <div>
                <label htmlFor="subscribers" className="block text-base font-bold text-[#111111] mb-2">
                  구독자 수
                </label>
                <input
                  type="text"
                  id="subscribers"
                  name="subscribers"
                  required
                  placeholder="구독자 수를 입력해주세요"
                  className="w-full px-5 py-3.5 rounded-xl border-2 border-[#E0E0E0] text-base text-[#111111] placeholder:text-[#999999] focus:border-[#C41E1E] focus:outline-none transition-colors"
                />
              </div>

              {/* 이메일 */}
              <div>
                <label htmlFor="email" className="block text-base font-bold text-[#111111] mb-2">
                  이메일 연락처
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="example@gmail.com"
                  className="w-full px-5 py-3.5 rounded-xl border-2 border-[#E0E0E0] text-base text-[#111111] placeholder:text-[#999999] focus:border-[#C41E1E] focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#C41E1E] text-white font-bold text-lg sm:text-xl py-4 sm:py-5 rounded-full hover:bg-[#A01818] transition-all hover:shadow-lg hover:shadow-[#C41E1E]/20 cursor-pointer"
              >
                🚀 입점 신청하기
              </button>
            </form>

            {/* 담당자 연락처 */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#F9FAFB] rounded-2xl p-6 sm:p-8">
                <h3 className="text-xl font-bold text-[#111111] mb-4">
                  직접 연락하기
                </h3>
                <div className="space-y-4">
                  {CONTACTS.map((c, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#C41E1E] text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="text-base font-bold text-[#111111]">
                          {c.name} <span className="text-sm text-[#C41E1E] font-medium">{c.role}</span>
                        </div>
                        <a
                          href={`tel:${c.phone.replace(/-/g, "")}`}
                          className="text-[#666666] text-base hover:text-[#C41E1E] transition-colors"
                        >
                          📞 {c.phone}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#FFF0F3] rounded-2xl p-6 sm:p-8">
                <h3 className="text-xl font-bold text-[#C41E1E] mb-3">
                  왜 TUBEPING인가요?
                </h3>
                <ul className="space-y-2 text-base text-[#666666]">
                  <li>✅ 초기 투자비 0원</li>
                  <li>✅ 상품 소싱부터 CS까지 전담</li>
                  <li>✅ 투명한 실시간 정산</li>
                  <li>✅ 23+ 파트너 크리에이터</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-[#111111] text-white py-10 sm:py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <div className="text-2xl font-extrabold tracking-tight mb-2">
                <span className="text-[#C41E1E]">Tube</span>
                <span className="text-white">Ping</span>
              </div>
              <p className="text-base text-[#CCCCCC]">
                유튜브 쇼핑 채널을 위한 올인원 커머스 플랫폼
              </p>
            </div>
            <div className="text-base text-[#CCCCCC] space-y-1">
              <p>㈜신산애널리틱스</p>
              <p>대표: 최준 · 사업자등록번호: 352-81-03270</p>
            </div>
          </div>
          <div className="border-t border-[#333333] mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#AAAAAA]">
              &copy; 2026 TubePing. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="/terms" className="text-sm text-[#AAAAAA] hover:text-white transition-colors">
                이용약관
              </a>
              <a href="/privacy" className="text-sm text-[#AAAAAA] hover:text-white transition-colors">
                개인정보처리방침
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

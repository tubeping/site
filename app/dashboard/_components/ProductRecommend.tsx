"use client";

import { useState, useEffect, useCallback } from "react";

// ─── 타입 (API 응답과 매핑) ───
interface RecommendItem {
  rank: number;
  keyword: string;
  stars: number;
  starsDisplay: string;
  score: number;
  searchVolume: number;
  clicks: number;
  ctr: number;
  isShopping: boolean;
  contentScore: number;
  purchaseScore: number;
  demandScore: number;
  trendScore: number;
  audienceScore: number;
}

interface CategoryBlock {
  emoji: string;
  items: RecommendItem[];
}

interface AgeRow { label: string; pct: number }
interface Persona {
  subscribers: number;
  tier: string;
  coreDemo: string;
  age: AgeRow[];
  gender: { female: number; male: number };
  device: Record<string, number>;
  interests: string[];
  categories: string[];
}

interface ExpectedPerformance {
  avgViewsEst: number;
  avgViewsSource: string;
  conversionLow: number;
  conversionHigh: number;
  aovLow: number;
  aovHigh: number;
  revenueLow: number;
  revenueHigh: number;
}

interface ShoppingInsights {
  expectedPerformance: ExpectedPerformance;
  categoryFitScores: Record<string, number>;
  personaSummary: string;
}

interface RecData {
  channel: string;
  generatedAt: string;
  persona: Persona;
  shoppingInsights?: ShoppingInsights;
  recommendations: Record<string, CategoryBlock>;
  weights: Record<string, number>;
}

// ─── 유틸 ───
function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
function formatNumber(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "만";
  return n.toLocaleString("ko-KR");
}
function starsText(stars: number) {
  const full = Math.floor(stars);
  const half = stars - full >= 0.5 ? "½" : "";
  return "★".repeat(full) + half;
}

// ─── 메인 컴포넌트 ───
export default function ProductRecommend() {
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [data, setData] = useState<RecData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [showPersona, setShowPersona] = useState(false);

  // 채널 목록 로드
  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((d) => {
        const list: string[] = d.channels || [];
        setChannels(list);
        if (list.length > 0 && !selectedChannel) setSelectedChannel(list[0]);
      })
      .catch(() => setChannels([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 선택 채널 데이터 로드
  const loadChannel = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommendations?channel=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: RecData = await res.json();
      setData(d);
      const firstCat = Object.keys(d.recommendations)[0] || "";
      setActiveCategory(firstCat);
    } catch (e) {
      setError("추천 데이터를 불러올 수 없습니다");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChannel) loadChannel(selectedChannel);
  }, [selectedChannel, loadChannel]);

  const categories = data ? Object.keys(data.recommendations) : [];
  const activeBlock = data && activeCategory ? data.recommendations[activeCategory] : null;

  return (
    <div className="p-4 sm:p-6">
      {/* 헤더 */}
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">상품 추천</h2>
          <p className="mt-1 text-sm text-gray-500">
            채널 시청자 × 네이버 검색광고 × 데이터랩 연령 가중으로 산출된 맞춤 추천
          </p>
        </div>

        {channels.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">채널</label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-[#C41E1E] focus:outline-none"
            >
              {channels.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 로딩/에러 */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
          <span className="ml-3 text-sm text-gray-500">추천 데이터 로드 중...</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && !data && channels.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          아직 분석된 채널이 없습니다. <br />
          엔진에서 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">python run_recommend.py [채널명]</code> 실행 후 다시 시도.
        </div>
      )}

      {data && (
        <>
          {/* ── 채널 페르소나 요약 ── */}
          <div className="mb-5 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#C41E1E] text-lg font-bold text-white">
                  {data.channel[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900">{data.channel}</h3>
                    <span className="rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-medium text-white">
                      {data.persona.tier}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    구독자 {data.persona.subscribers.toLocaleString("ko-KR")}명 · 핵심 {data.persona.coreDemo}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    갱신: {formatDate(data.generatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:ml-auto flex-wrap">
                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2 text-center min-w-[90px]">
                  <p className="text-[10px] text-gray-400">추천 카테고리</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{categories.length}개</p>
                </div>
                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2 text-center min-w-[90px]">
                  <p className="text-[10px] text-gray-400">총 추천 키워드</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">
                    {Object.values(data.recommendations).reduce((sum, b) => sum + b.items.length, 0)}개
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPersona(!showPersona)}
              className="mt-3 cursor-pointer text-xs text-gray-500 hover:text-gray-700"
            >
              {showPersona ? "페르소나 접기 ↑" : "페르소나 상세 보기 ↓"}
            </button>

            {showPersona && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">연령 분포 (실측)</p>
                  <div className="space-y-1.5">
                    {data.persona.age.filter((a) => a.pct > 0).map((a) => (
                      <div key={a.label} className="flex items-center gap-2">
                        <span className="w-14 text-[11px] text-gray-500">{a.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full bg-[#C41E1E] rounded-full"
                            style={{ width: `${Math.min(100, a.pct * 2)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-[11px] font-medium text-gray-700">
                          {a.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">성별</p>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-10 text-[11px] text-gray-500">남성</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${data.persona.gender.male}%` }} />
                      </div>
                      <span className="w-10 text-right text-[11px]">{data.persona.gender.male.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-10 text-[11px] text-gray-500">여성</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full bg-pink-400 rounded-full" style={{ width: `${data.persona.gender.female}%` }} />
                      </div>
                      <span className="w-10 text-right text-[11px]">{data.persona.gender.female.toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">채널 관심사</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.persona.interests.map((kw) => (
                      <span key={kw} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 🛒 쇼핑 인사이트 3개 ── */}
          {data.shoppingInsights && (
            <div className="mb-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* 쇼핑 페르소나 한 줄 */}
              <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🧑‍🤝‍🧑</span>
                  <h4 className="text-xs font-bold text-gray-900">쇼핑 페르소나</h4>
                </div>
                <p className="text-[13px] leading-relaxed text-gray-700">
                  {data.shoppingInsights.personaSummary}
                </p>
              </div>

              {/* 영상당 예상 공구 성과 */}
              <div className="rounded-xl border border-[#C41E1E]/20 bg-gradient-to-br from-red-50 to-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💰</span>
                  <h4 className="text-xs font-bold text-gray-900">영상당 예상 공구 매출</h4>
                </div>
                <p className="text-lg font-bold text-[#C41E1E]">
                  {(data.shoppingInsights.expectedPerformance.revenueLow / 10000).toFixed(0)}만
                  ~
                  {(data.shoppingInsights.expectedPerformance.revenueHigh / 10000).toFixed(0)}만원
                </p>
                <div className="mt-2 space-y-0.5 text-[10px] text-gray-500">
                  <p>평균 조회 {data.shoppingInsights.expectedPerformance.avgViewsEst.toLocaleString("ko-KR")} <span className="text-gray-400">({data.shoppingInsights.expectedPerformance.avgViewsSource})</span></p>
                  <p>전환율 {(data.shoppingInsights.expectedPerformance.conversionLow * 100).toFixed(1)}~{(data.shoppingInsights.expectedPerformance.conversionHigh * 100).toFixed(1)}%</p>
                  <p>객단가 {(data.shoppingInsights.expectedPerformance.aovLow / 10000).toFixed(0)}~{(data.shoppingInsights.expectedPerformance.aovHigh / 10000).toFixed(0)}만원</p>
                </div>
              </div>

              {/* 카테고리 적합도 Top 3 */}
              <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <h4 className="text-xs font-bold text-gray-900">카테고리 적합도 TOP 3</h4>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(data.shoppingInsights.categoryFitScores)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([cat, score]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-700 w-20 truncate">
                          {data.recommendations[cat]?.emoji} {cat}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-green-700 w-8 text-right">
                          {score.toFixed(0)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 전체 카테고리 적합도 (상세) ── */}
          {data.shoppingInsights && (
            <details className="mb-5 rounded-xl border border-gray-100 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                📊 전체 카테고리 적합도 점수 펼치기
              </summary>
              <div className="px-4 pb-4 space-y-1.5">
                {Object.entries(data.shoppingInsights.categoryFitScores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, score]) => {
                    const tier = score >= 70 ? "bg-green-500" : score >= 55 ? "bg-amber-400" : "bg-gray-300";
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-xs text-gray-700 w-28 truncate">
                          {data.recommendations[cat]?.emoji} {cat}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className={`h-full rounded-full ${tier}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 w-10 text-right">
                          {score.toFixed(0)}점
                        </span>
                      </div>
                    );
                  })}
              </div>
            </details>
          )}

          {/* ── 스코어링 로직 안내 ── */}
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <p className="text-[11px] text-blue-700 leading-relaxed">
              <b>스코어링 공식</b>:&nbsp;
              콘텐츠매칭 {(data.weights.content_match * 100).toFixed(0)}% ·
              구매의도 {(data.weights.purchase_intent * 100).toFixed(0)}% ·
              검색수요 {(data.weights.search_demand * 100).toFixed(0)}% ·
              트렌드/시즌 {(data.weights.trend_match * 100).toFixed(0)}% ·
              연령대매칭 {(data.weights.audience_match * 100).toFixed(0)}%
              &nbsp;· 책/부업/건강검진/보험 등 정보성 키워드는 블랙리스트로 제외됨
            </p>
          </div>

          {/* ── 카테고리 탭 ── */}
          <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100 pb-4">
            {categories.map((cat) => {
              const block = data.recommendations[cat];
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setExpandedKeyword(null);
                  }}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive ? "bg-[#C41E1E] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span className="mr-1">{block.emoji}</span>
                  {cat}
                  <span className={`ml-1.5 text-[10px] ${isActive ? "opacity-80" : "text-gray-400"}`}>
                    ({block.items.length})
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── 카테고리별 추천 리스트 ── */}
          {activeBlock && (
            <div className="space-y-2">
              {activeBlock.items.map((it) => {
                const isExpanded = expandedKeyword === it.keyword;
                return (
                  <div
                    key={it.keyword}
                    className="rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300"
                  >
                    <button
                      onClick={() => setExpandedKeyword(isExpanded ? null : it.keyword)}
                      className="w-full cursor-pointer text-left p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold text-gray-400 w-6 shrink-0 pt-0.5">
                          {it.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{it.keyword}</span>
                            {it.isShopping && (
                              <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                                쇼핑성
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-gray-500">
                            <span className="text-amber-500 font-medium">{starsText(it.stars)}</span>
                            <span className="text-[#C41E1E] font-bold">{it.score.toFixed(1)}점</span>
                            <span>검색 <b className="text-gray-800">{formatNumber(it.searchVolume)}</b></span>
                            <span>클릭 <b className="text-gray-800">{formatNumber(it.clicks)}</b></span>
                            <span>CTR <b className="text-gray-800">{it.ctr.toFixed(1)}%</b></span>
                          </div>
                        </div>
                        <span className="text-gray-300 shrink-0">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/50">
                        <p className="text-xs font-semibold text-gray-700 mb-2">점수 내역</p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { label: "콘텐츠매칭", value: it.contentScore, color: "bg-purple-400" },
                            { label: "구매의도", value: it.purchaseScore, color: "bg-pink-400" },
                            { label: "검색수요", value: it.demandScore, color: "bg-blue-400" },
                            { label: "트렌드/시즌", value: it.trendScore, color: "bg-green-400" },
                            { label: "연령대매칭", value: it.audienceScore, color: "bg-amber-400" },
                          ].map((s) => (
                            <div key={s.label} className="rounded-lg bg-white p-2.5 border border-gray-100">
                              <p className="text-[10px] text-gray-500 mb-1">{s.label}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${Math.min(100, s.value)}%` }} />
                                </div>
                                <span className="text-[11px] font-semibold text-gray-700 w-8 text-right">
                                  {s.value.toFixed(0)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <a
                            href={`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(it.keyword)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:underline"
                          >
                            네이버 쇼핑에서 검색 →
                          </a>
                          <a
                            href={`https://www.coupang.com/np/search?q=${encodeURIComponent(it.keyword)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:underline"
                          >
                            쿠팡에서 검색 →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 하단 안내 ── */}
          <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">로직 개선 로드맵</p>
            <ul className="space-y-1 text-[11px] text-gray-500">
              <li>• v1 (현재): 네이버 검색광고 + 데이터랩 연령별 인기검색어 5축 가중</li>
              <li>• v2: 셀러라이프 엑셀 (경쟁률·판매지수·쿠팡리뷰) 연동 → 판매성 검증 강화</li>
              <li>• v3: 카페24 재고와 매칭 → &quot;즉시 공구 가능&quot; vs &quot;소싱 제안&quot; 분리</li>
              <li>• v4: 자체 판매 데이터 학습 → 가중치 자동 튜닝</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

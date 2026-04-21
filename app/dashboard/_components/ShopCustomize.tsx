"use client";

import React, { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── 타입 ───
interface ShopBlock {
  id: string;
  type: "hero" | "text" | "image" | "banner" | "links" | "picks" | "video" | "divider" | "gallery" | "calendar" | "campaign_live" | "campaign_teaser";
  data: Record<string, unknown>;
}

interface LinkItem { id: string; label: string; url: string; icon: string; }

const BLOCK_TYPES: { type: ShopBlock["type"]; label: string; icon: string; desc: string }[] = [
  { type: "hero", label: "프로필", icon: "👤", desc: "커버·프로필·소개" },
  { type: "text", label: "텍스트", icon: "📝", desc: "자유 텍스트" },
  { type: "image", label: "이미지", icon: "🖼️", desc: "이미지 + 캡션" },
  { type: "campaign_live", label: "공구 라이브", icon: "🔴", desc: "진행률+카운트다운" },
  { type: "campaign_teaser", label: "공구 티저", icon: "🔔", desc: "오픈 전 알림 신청" },
  { type: "banner", label: "배너", icon: "🔥", desc: "공구/이벤트" },
  { type: "calendar", label: "공구 캘린더", icon: "📅", desc: "월별 공구 일정" },
  { type: "links", label: "링크", icon: "🔗", desc: "SNS·외부 링크" },
  { type: "picks", label: "상품", icon: "📦", desc: "내 PICK" },
  { type: "video", label: "영상", icon: "▶️", desc: "유튜브" },
  { type: "divider", label: "구분선", icon: "━", desc: "섹션 구분" },
  { type: "gallery", label: "갤러리", icon: "🎨", desc: "이미지 그리드" },
];

const DEFAULT_BLOCKS: ShopBlock[] = [
  { id: "b1", type: "hero", data: { name: "내 쇼핑몰", bio: "", cover_url: "", profile_url: "" } },
  { id: "b2", type: "links", data: { items: [{ id: "l1", label: "Instagram", url: "", icon: "📷" }, { id: "l2", label: "YouTube", url: "", icon: "▶️" }] } },
  { id: "b3", type: "picks", data: { filter: "all", limit: 12 } },
];

let blockCounter = 100;
function newId() { return "b" + (++blockCounter) + "_" + Date.now(); }

// ─── 드래그 가능 블록 ───
function SortableBlock({ block, isSelected, onSelect, onDelete, compact }: {
  block: ShopBlock; isSelected: boolean; onSelect: () => void; onDelete: () => void; compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.5 : 1 };
  const meta = BLOCK_TYPES.find(t => t.type === block.type);

  if (compact) {
    return (
      <div ref={setNodeRef} style={style} onClick={onSelect} {...attributes} {...listeners}
        title={meta?.label}
        className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all cursor-pointer active:cursor-grabbing ${
          isSelected ? "border-[#C41E1E] bg-[#FFF5F5] shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
        }`}>
        <span className="text-base">{meta?.icon}</span>
        {isSelected && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#C41E1E]" />
        )}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}
      className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all cursor-pointer ${
        isSelected ? "border-[#C41E1E] bg-[#FFF5F5] shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0">
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>
      <span className="text-base shrink-0">{meta?.icon}</span>
      <span className="flex-1 text-sm font-medium text-gray-800">{meta?.label}</span>
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        className="cursor-pointer opacity-0 group-hover:opacity-100 rounded-md p-1 text-gray-300 hover:text-[#C41E1E] hover:bg-red-50 transition-all">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ─── 편집 패널 ───
function BlockEditor({ block, onChange }: { block: ShopBlock; onChange: (data: Record<string, unknown>) => void }) {
  const d = block.data;
  const meta = BLOCK_TYPES.find(t => t.type === block.type);
  const ic = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E] focus:bg-white focus:ring-1 focus:ring-[#C41E1E]/20 transition-all";
  const lc = "mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wider";

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <span className="text-xl">{meta?.icon}</span>
        <div><h4 className="text-sm font-bold text-gray-900">{meta?.label} 설정</h4><p className="text-[10px] text-gray-400">{meta?.desc}</p></div>
      </div>
      <div className="space-y-4">
        {block.type === "hero" && (<>
          <div><label className={lc}>쇼핑몰 이름</label><input type="text" value={(d.name as string) || ""} onChange={e => onChange({ ...d, name: e.target.value })} className={ic} /></div>
          <div><label className={lc}>소개글</label><textarea value={(d.bio as string) || ""} onChange={e => onChange({ ...d, bio: e.target.value })} rows={3} placeholder="나를 소개하는 글" className={ic + " resize-none"} /></div>
          <div><label className={lc}>커버 이미지</label><input type="url" value={(d.cover_url as string) || ""} onChange={e => onChange({ ...d, cover_url: e.target.value })} placeholder="https://..." className={ic} /></div>
          <div><label className={lc}>프로필 이미지</label><input type="url" value={(d.profile_url as string) || ""} onChange={e => onChange({ ...d, profile_url: e.target.value })} placeholder="https://..." className={ic} /></div>
        </>)}
        {block.type === "text" && (<div><label className={lc}>내용</label><textarea value={(d.content as string) || ""} onChange={e => onChange({ ...d, content: e.target.value })} rows={6} placeholder="자유롭게 텍스트를 입력하세요" className={ic + " resize-none"} /></div>)}
        {block.type === "image" && (<>
          <div><label className={lc}>이미지 URL</label><input type="url" value={(d.url as string) || ""} onChange={e => onChange({ ...d, url: e.target.value })} placeholder="https://..." className={ic} /></div>
          <div><label className={lc}>캡션</label><input type="text" value={(d.caption as string) || ""} onChange={e => onChange({ ...d, caption: e.target.value })} className={ic} /></div>
        </>)}
        {block.type === "banner" && (<>
          <div><label className={lc}>배너 제목</label><input type="text" value={(d.title as string) || ""} onChange={e => onChange({ ...d, title: e.target.value })} placeholder="이번 주 공구!" className={ic} /></div>
          <div><label className={lc}>부제목</label><input type="text" value={(d.subtitle as string) || ""} onChange={e => onChange({ ...d, subtitle: e.target.value })} className={ic} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>D-day</label><input type="number" value={(d.dday as number) ?? ""} onChange={e => onChange({ ...d, dday: parseInt(e.target.value) || 0 })} className={ic} /></div>
            <div><label className={lc}>배너 이미지</label><input type="url" value={(d.image_url as string) || ""} onChange={e => onChange({ ...d, image_url: e.target.value })} placeholder="https://..." className={ic} /></div>
          </div>
          <div><label className={lc}>링크 URL</label><input type="url" value={(d.link_url as string) || ""} onChange={e => onChange({ ...d, link_url: e.target.value })} className={ic} /></div>
        </>)}
        {block.type === "links" && (() => {
          const items = (d.items as LinkItem[]) || [];
          return (<>
            {items.map((item, i) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">링크 {i + 1}</span>
                  <button onClick={() => onChange({ ...d, items: items.filter(x => x.id !== item.id) })} className="cursor-pointer text-[10px] text-red-400 hover:text-red-600">삭제</button>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={item.icon} onChange={e => { const n = [...items]; n[i] = { ...item, icon: e.target.value }; onChange({ ...d, items: n }); }} className="w-12 rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-sm outline-none" />
                  <input type="text" value={item.label} onChange={e => { const n = [...items]; n[i] = { ...item, label: e.target.value }; onChange({ ...d, items: n }); }} placeholder="라벨" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
                </div>
                <input type="url" value={item.url} onChange={e => { const n = [...items]; n[i] = { ...item, url: e.target.value }; onChange({ ...d, items: n }); }} placeholder="https://..." className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none" />
              </div>
            ))}
            <button onClick={() => onChange({ ...d, items: [...items, { id: "l" + Date.now(), label: "", url: "", icon: "🔗" }] })}
              className="cursor-pointer w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-xs font-medium text-gray-400 hover:border-[#C41E1E] hover:text-[#C41E1E] transition-colors">+ 링크 추가</button>
          </>);
        })()}
        {block.type === "video" && (<div><label className={lc}>유튜브 URL</label><input type="url" value={(d.youtube_url as string) || ""} onChange={e => onChange({ ...d, youtube_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className={ic} /></div>)}
        {block.type === "picks" && (<>
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">내 PICK에 등록된 상품이 자동 표시됩니다</p>
          <div><label className={lc}>표시 개수</label><input type="number" value={(d.limit as number) || 12} onChange={e => onChange({ ...d, limit: parseInt(e.target.value) || 12 })} min={1} max={50} className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#C41E1E]" /></div>
        </>)}
        {block.type === "gallery" && (<>
          <div><label className={lc}>이미지 URL (줄바꿈 구분)</label><textarea value={((d.images as string[]) || []).join("\n")} onChange={e => onChange({ ...d, images: e.target.value.split("\n").filter(Boolean) })} rows={4} placeholder={"https://image1.jpg\nhttps://image2.jpg"} className={ic + " resize-none font-mono text-xs"} /></div>
          <div><label className={lc}>열 수</label><div className="flex gap-2">{[2, 3, 4].map(n => (<button key={n} onClick={() => onChange({ ...d, columns: n })} className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold transition-all ${(d.columns || 2) === n ? "bg-[#C41E1E] text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{n}열</button>))}</div></div>
        </>)}
        {block.type === "divider" && (<p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-center">설정 없음</p>)}
      </div>
    </div>
  );
}

// ─── 프리뷰 ───
function BlockPreview({ block, isSelected }: { block: ShopBlock; isSelected: boolean }) {
  const d = block.data;
  const ring = isSelected ? "ring-2 ring-[#C41E1E] ring-offset-1 rounded-lg" : "";

  switch (block.type) {
    case "hero": return (
      <div className={ring}>
        <div className="h-24 bg-gradient-to-br from-[#C41E1E] via-[#a01818] to-[#111111] overflow-hidden">
          {(d.cover_url as string) ? <img src={d.cover_url as string} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="px-3 -mt-6 relative">
          <div className="flex items-end gap-2">
            <div className="h-12 w-12 rounded-full border-[3px] border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
              {(d.profile_url as string) ? <img src={d.profile_url as string} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="text-gray-400 text-sm">👤</span>}
            </div>
            <div className="pb-0.5"><p className="text-[11px] font-bold text-gray-900">{(d.name as string) || "내 쇼핑몰"}</p>
              {(d.bio as string) && <p className="text-[8px] text-gray-400 line-clamp-1">{d.bio as string}</p>}</div>
          </div>
        </div>
      </div>
    );
    case "text": return <div className={`px-3 py-2 ${ring}`}><p className="text-[9px] text-gray-600 whitespace-pre-wrap line-clamp-4 leading-relaxed">{(d.content as string) || "텍스트를 입력하세요..."}</p></div>;
    case "image": return <div className={`px-3 py-2 ${ring}`}>{(d.url as string) ? <img src={d.url as string} alt="" className="w-full rounded-lg shadow-sm" /> : <div className="h-20 rounded-lg bg-gray-100 border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">🖼️</div>}</div>;
    case "banner": return (
      <div className={`px-3 py-2 ${ring}`}>
        <div className="rounded-xl bg-gradient-to-r from-[#C41E1E] to-[#8B1515] p-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mt-4 -mr-4" />
          {(d.dday as number) !== undefined && <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[7px] font-bold text-white mb-1">D-{d.dday as number}</span>}
          <p className="text-[10px] font-bold text-white">{(d.title as string) || "배너 제목"}</p>
          {(d.subtitle as string) && <p className="text-[7px] text-white/70 mt-0.5">{d.subtitle as string}</p>}
          <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-[7px] font-bold text-[#C41E1E]">자세히 →</span>
        </div>
      </div>
    );
    case "links": { const items = (d.items as LinkItem[]) || []; return (
      <div className={`px-3 py-2 space-y-1 ${ring}`}>
        {items.slice(0, 3).map(item => (<div key={item.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white p-2 shadow-sm"><span className="text-xs">{item.icon}</span><span className="text-[8px] font-medium text-gray-700 flex-1">{item.label || "링크"}</span></div>))}
      </div>
    ); }
    case "picks": return (
      <div className={`px-3 py-2 ${ring}`}><p className="text-[8px] font-bold text-gray-900 mb-1.5">📦 PICK</p>
        <div className="grid grid-cols-3 gap-1">{[1, 2, 3].map(i => (<div key={i} className="rounded-lg bg-gray-100 aspect-square flex items-center justify-center text-[8px] text-gray-300">📦</div>))}</div>
      </div>
    );
    case "video": { const url = (d.youtube_url as string) || ""; const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/); return (
      <div className={`px-3 py-2 ${ring}`}>{m ? <div className="aspect-video rounded-lg overflow-hidden shadow-sm"><iframe src={`https://www.youtube.com/embed/${m[1]}`} className="h-full w-full" /></div> : <div className="aspect-video rounded-lg bg-gray-900 flex items-center justify-center"><span className="text-white/30 text-lg">▶</span></div>}</div>
    ); }
    case "divider": return <div className={`px-6 py-3 ${ring}`}><hr className="border-gray-100" /></div>;
    case "gallery": { const imgs = (d.images as string[]) || []; const c = (d.columns as number) || 2; return (
      <div className={`px-3 py-2 ${ring}`}><div className={`grid gap-1 ${c === 2 ? "grid-cols-2" : c === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {imgs.length > 0 ? imgs.slice(0, 6).map((img, i) => <img key={i} src={img} alt="" className="w-full aspect-square rounded-lg object-cover" />) : [1, 2, 3, 4].map(i => <div key={i} className="rounded-lg bg-gray-100 aspect-square flex items-center justify-center text-[7px] text-gray-300">🎨</div>)}
      </div></div>
    ); }
    default: return null;
  }
}

// ─── 메인 ───
export default function ShopCustomize() {
  const [blocks, setBlocks] = useState<ShopBlock[]>(DEFAULT_BLOCKS);
  const [selectedId, setSelectedId] = useState<string | null>("b1");
  const [showPalette, setShowPalette] = useState(false);
  const selectedBlock = blocks.find(b => b.id === selectedId) || null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks(prev => { const o = prev.findIndex(b => b.id === active.id); const n = prev.findIndex(b => b.id === over.id); return arrayMove(prev, o, n); });
    }
  }, []);

  const addBlock = useCallback((type: ShopBlock["type"]) => {
    const dd: Record<string, Record<string, unknown>> = {
      hero: { name: "내 쇼핑몰", bio: "", cover_url: "", profile_url: "" }, text: { content: "" }, image: { url: "", caption: "" },
      banner: { title: "", subtitle: "", link_url: "", dday: 3 }, links: { items: [] }, picks: { filter: "all", limit: 12 },
      video: { youtube_url: "" }, divider: {}, gallery: { images: [], columns: 2 },
    };
    const nb: ShopBlock = { id: newId(), type, data: dd[type] || {} };
    setBlocks(prev => [...prev, nb]); setSelectedId(nb.id); setShowPalette(false);
  }, []);

  return (
    <div className="flex h-full bg-[#FAFAFA] relative">
      {/* ─────────── Col 1: 블록 리스트 (PC 전체 / Mobile 아이콘) ─────────── */}
      <div className="w-[64px] md:w-[220px] shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* 헤더 + 추가 버튼 */}
        <div className="p-2 md:p-4 border-b border-gray-100 flex md:block flex-col items-center gap-2">
          <div className="hidden md:block mb-3">
            <h3 className="text-sm font-bold text-gray-900">블록 구성</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">드래그로 순서 변경</p>
          </div>
          <button onClick={() => setShowPalette(!showPalette)}
            title="블록 추가"
            className={`cursor-pointer flex items-center justify-center rounded-lg md:w-full h-10 md:h-auto w-10 md:px-3 md:py-2 text-xs font-bold transition-all ${
              showPalette ? "bg-gray-900 text-white" : "bg-[#C41E1E] text-white hover:bg-[#A01818] shadow-sm"
            }`}>
            <span className="md:hidden text-lg">{showPalette ? "✕" : "+"}</span>
            <span className="hidden md:inline">{showPalette ? "✕ 닫기" : "+ 블록 추가"}</span>
          </button>
        </div>

        {/* 팔레트 (모바일: 오버레이, PC: 인라인) */}
        {showPalette && (
          <>
            {/* 모바일: 아래에서 올라오는 시트 */}
            <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowPalette(false)}>
              <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">블록 추가</h4>
                  <button onClick={() => setShowPalette(false)} className="cursor-pointer text-gray-400 hover:text-gray-600 text-lg">✕</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BLOCK_TYPES.map(bt => (
                    <button key={bt.type} onClick={() => addBlock(bt.type)} className="cursor-pointer flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-white p-3 hover:border-[#C41E1E] hover:shadow-md transition-all group">
                      <span className="text-xl">{bt.icon}</span>
                      <span className="text-[10px] font-bold text-gray-600">{bt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PC: 인라인 팔레트 */}
            <div className="hidden md:block p-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
              <div className="grid grid-cols-3 gap-2">
                {BLOCK_TYPES.map(bt => (
                  <button key={bt.type} onClick={() => addBlock(bt.type)} className="cursor-pointer flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-white p-2.5 hover:border-[#C41E1E] hover:shadow-md transition-all group">
                    <span className="text-lg group-hover:scale-110 transition-transform">{bt.icon}</span>
                    <span className="text-[10px] font-bold text-gray-600 group-hover:text-[#C41E1E]">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 블록 리스트 */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {/* 모바일: 아이콘 버전 */}
              <div className="md:hidden flex flex-col items-center gap-2">
                {blocks.map(block => (
                  <SortableBlock key={block.id} block={block} isSelected={selectedId === block.id} compact
                    onSelect={() => setSelectedId(block.id)} onDelete={() => { setBlocks(prev => prev.filter(b => b.id !== block.id)); if (selectedId === block.id) setSelectedId(null); }} />
                ))}
              </div>
              {/* PC: 전체 버전 */}
              <div className="hidden md:block space-y-1.5">
                {blocks.map(block => (
                  <SortableBlock key={block.id} block={block} isSelected={selectedId === block.id}
                    onSelect={() => setSelectedId(block.id)} onDelete={() => { setBlocks(prev => prev.filter(b => b.id !== block.id)); if (selectedId === block.id) setSelectedId(null); }} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* 하단 저장 버튼 */}
        <div className="border-t border-gray-100 p-2 md:p-4 bg-white space-y-2">
          <button title="저장"
            className="cursor-pointer w-full flex items-center justify-center rounded-xl bg-[#C41E1E] h-10 md:py-3 text-sm font-bold text-white hover:bg-[#A01818] shadow-sm">
            <span className="md:hidden">💾</span>
            <span className="hidden md:inline">저장</span>
          </button>
          <a href="/shop/gwibinjeong" target="_blank" rel="noopener noreferrer"
            title="내 쇼핑몰 보기"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 h-10 md:py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            <span className="hidden md:inline">내 쇼핑몰 보기</span>
          </a>
        </div>
      </div>

      {/* ─────────── Col 2: 편집 패널 (PC only) ─────────── */}
      <div className="hidden md:flex md:w-[320px] shrink-0 bg-white border-r border-gray-100 flex-col">
        {selectedBlock ? (
          <div className="flex-1 overflow-y-auto p-5">
            <BlockEditor block={selectedBlock} onChange={data => setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, data } : b))} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-3xl mb-3">👈</p>
              <p className="text-sm font-medium text-gray-900">블록을 선택하세요</p>
              <p className="text-xs text-gray-400 mt-1">왼쪽에서 편집할 블록을<br />클릭하면 여기에 표시됩니다</p>
            </div>
          </div>
        )}
      </div>

      {/* ─────────── Col 3: 미리보기 ─────────── */}
      <div className="flex-1 flex items-start justify-center p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="w-[280px] md:w-[320px] rounded-[3rem] border-[10px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
          <div className="flex justify-center bg-gray-900 pt-2 pb-1.5"><div className="h-[24px] w-[90px] rounded-full bg-black" /></div>
          <div className="h-[620px] bg-white overflow-y-auto">
            {blocks.map(block => (
              <div key={block.id} onClick={() => setSelectedId(block.id)} className="cursor-pointer">
                <BlockPreview block={block} isSelected={selectedId === block.id} />
              </div>
            ))}
            {blocks.length === 0 && <div className="flex items-center justify-center h-full text-gray-300 text-xs">블록을 추가하세요</div>}
            <div className="py-4 text-center"><p className="text-[7px] text-gray-300">Powered by <span className="font-bold"><span className="text-[#C41E1E]">Tube</span><span className="text-gray-600">Ping</span></span></p></div>
          </div>
          <div className="flex justify-center bg-gray-900 py-2"><div className="h-[4px] w-[80px] rounded-full bg-gray-600" /></div>
        </div>
      </div>

      {/* ─────────── Mobile 바텀시트: 편집 패널 ─────────── */}
      {selectedBlock && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl max-h-[65vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">{BLOCK_TYPES.find(t => t.type === selectedBlock.type)?.icon}</span>
              <span className="text-sm font-bold text-gray-900">{BLOCK_TYPES.find(t => t.type === selectedBlock.type)?.label} 설정</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setBlocks(prev => prev.filter(b => b.id !== selectedBlock.id)); setSelectedId(null); }}
                className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:text-[#C41E1E] hover:bg-red-50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <button onClick={() => setSelectedId(null)} className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-5">
            <BlockEditor block={selectedBlock} onChange={data => setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, data } : b))} />
          </div>
        </div>
      )}
    </div>
  );
}

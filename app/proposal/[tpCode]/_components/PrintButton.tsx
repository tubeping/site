"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-white text-[#111111] border border-[#E0E0E0] font-semibold text-sm px-5 py-2.5 rounded-full hover:border-[#111111] transition-colors"
    >
      🖨️ PDF로 저장 / 인쇄
    </button>
  );
}

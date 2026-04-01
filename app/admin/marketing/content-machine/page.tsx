const PIPELINES = [
  { id: 1, name: "봄 시즌 상품 리뷰", type: "상품 리뷰", status: "진행중", progress: 65, posts: 8, target: 12 },
  { id: 2, name: "유튜브 트렌드 위클리", type: "트렌드 분석", status: "진행중", progress: 40, posts: 4, target: 10 },
  { id: 3, name: "카테고리 SEO 콘텐츠", type: "SEO", status: "대기", progress: 0, posts: 0, target: 20 },
  { id: 4, name: "인플루언서 인터뷰 시리즈", type: "인터뷰", status: "완료", progress: 100, posts: 5, target: 5 },
];

const QUEUE = [
  { title: "에어프라이어 비교 리뷰 5종", scheduled: "2026-04-02 09:00", channel: "블로그" },
  { title: "4월 첫째주 트렌드 키워드 분석", scheduled: "2026-04-03 10:00", channel: "블로그" },
  { title: "무선이어폰 가성비 TOP3", scheduled: "2026-04-04 09:00", channel: "인스타그램" },
  { title: "봄 캠핑 필수템 가이드", scheduled: "2026-04-05 11:00", channel: "블로그" },
];

const STATUS_STYLE: Record<string, string> = {
  "진행중": "bg-blue-100 text-blue-700",
  "대기": "bg-gray-100 text-gray-600",
  "완료": "bg-green-100 text-green-700",
};

export default function ContentMachinePage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">콘텐츠 머신</h1>
          <p className="text-sm text-gray-500 mt-1">콘텐츠 자동 생성 파이프라인을 관리합니다.</p>
        </div>
        <button className="px-4 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] transition-colors cursor-pointer">
          + 새 파이프라인
        </button>
      </div>

      {/* Pipelines */}
      <div className="grid grid-cols-2 gap-5 mb-8">
        {PIPELINES.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status]}`}>
                {p.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">{p.type}</p>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="bg-[#C41E1E] h-2 rounded-full transition-all"
                style={{ width: `${p.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {p.posts} / {p.target} 게시글 ({p.progress}%)
            </p>
          </div>
        ))}
      </div>

      {/* Queue */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">발행 대기열</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {QUEUE.map((item, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-400 mt-1">{item.scheduled}</p>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{item.channel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

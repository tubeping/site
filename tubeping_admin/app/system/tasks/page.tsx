"use client";

import { useState } from "react";

type TaskStatus = "todo" | "in_progress" | "done";

type Task = {
  id: number;
  title: string;
  assignee: string;
  priority: string;
  due: string;
  status: TaskStatus;
};

const INITIAL_TASKS: Task[] = [
  // 할 일
  { id: 1, title: "Vercel 환경변수 카페24 키 업데이트 (CAFE24_CLIENT_ID/SECRET)", assignee: "개발팀", priority: "높음", due: "04/03", status: "todo" },
  { id: 2, title: "Supabase DB 마이그레이션 실행 (products, orders 테이블)", assignee: "개발팀", priority: "높음", due: "04/04", status: "todo" },
  { id: 3, title: "카페24 마진율(margin_rate) UI 표시", assignee: "개발팀", priority: "중간", due: "04/07", status: "todo" },
  { id: 4, title: "4월 프로모션 콘텐츠 기획", assignee: "마케팅팀", priority: "중간", due: "04/05", status: "todo" },
  { id: 5, title: "SEO 키워드 리서치 (4월)", assignee: "콘텐츠팀", priority: "중간", due: "04/08", status: "todo" },
  // 진행 중
  { id: 6, title: "어드민 사이드바 네비게이션 버그 수정", assignee: "개발팀", priority: "높음", due: "04/03", status: "in_progress" },
  { id: 7, title: "상품관리 — 옵션/재고/카페24 동기화", assignee: "개발팀", priority: "높음", due: "04/05", status: "in_progress" },
  { id: 8, title: "3월 정산 마감 처리", assignee: "재무팀", priority: "높음", due: "04/07", status: "in_progress" },
  // 완료
  { id: 9, title: "사이드바 href /admin 이중 적용 수정", assignee: "개발팀", priority: "높음", due: "04/03", status: "done" },
  { id: 10, title: "카페24 상품 가져오기 (자체코드 포함)", assignee: "개발팀", priority: "높음", due: "04/02", status: "done" },
  { id: 11, title: "카페24 OAuth 연동 완료", assignee: "개발팀", priority: "높음", due: "04/01", status: "done" },
  { id: 12, title: "스토어 관리 페이지 구축", assignee: "개발팀", priority: "중간", due: "04/01", status: "done" },
  { id: 13, title: "주문/발주/공급사 관리 페이지 구축", assignee: "개발팀", priority: "중간", due: "04/02", status: "done" },
  { id: 14, title: "tubeping_admin 프로젝트 분리", assignee: "개발팀", priority: "높음", due: "03/31", status: "done" },
];

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "할 일", color: "border-t-gray-400" },
  { key: "in_progress", label: "진행 중", color: "border-t-blue-500" },
  { key: "done", label: "완료", color: "border-t-green-500" },
];

const PRIORITY_STYLE: Record<string, string> = {
  "높음": "bg-red-100 text-red-700",
  "중간": "bg-yellow-100 text-yellow-700",
  "낮음": "bg-gray-100 text-gray-500",
};

export default function TasksPage() {
  const [tasks] = useState<Task[]>(INITIAL_TASKS);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">작업 관리</h1>
          <p className="text-sm text-gray-500 mt-1">팀별 작업을 칸반 보드로 관리합니다.</p>
        </div>
        <button className="px-4 py-2.5 bg-[#C41E1E] text-white text-sm font-medium rounded-lg hover:bg-[#A01818] transition-colors cursor-pointer">
          + 새 작업
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`bg-gray-50 rounded-xl border-t-4 ${col.color} p-4 min-h-[500px]`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className="space-y-3">
                {colTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer">
                    <p className="text-sm font-medium text-gray-900 mb-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{task.assignee}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{task.due}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_STYLE[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

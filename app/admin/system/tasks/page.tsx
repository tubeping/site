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
  { id: 1, title: "4월 프로모션 기획서 작성", assignee: "마케팅팀", priority: "높음", due: "04/05", status: "in_progress" },
  { id: 2, title: "신규 공급사 계약 검토", assignee: "사업팀", priority: "높음", due: "04/03", status: "todo" },
  { id: 3, title: "3월 정산 마감 처리", assignee: "재무팀", priority: "높음", due: "04/07", status: "in_progress" },
  { id: 4, title: "상품 이미지 리사이징 자동화", assignee: "개발팀", priority: "중간", due: "04/10", status: "todo" },
  { id: 5, title: "SEO 키워드 리서치 (4월)", assignee: "콘텐츠팀", priority: "중간", due: "04/08", status: "todo" },
  { id: 6, title: "채널 분석 리포트 v2 배포", assignee: "데이터팀", priority: "낮음", due: "04/12", status: "todo" },
  { id: 7, title: "공급사 API 연동 테스트", assignee: "개발팀", priority: "중간", due: "04/06", status: "in_progress" },
  { id: 8, title: "2월 매출 리포트 공유", assignee: "재무팀", priority: "낮음", due: "03/28", status: "done" },
  { id: 9, title: "인플루언서 온보딩 UX 개선", assignee: "디자인팀", priority: "중간", due: "03/30", status: "done" },
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

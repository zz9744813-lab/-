"use client";

import { useEffect, useState } from "react";
import { getGoalEvents } from "@/lib/actions/goals";

type EventRow = {
  id: string;
  goalId: string;
  type: string;
  note: string | null;
  reason: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  payloadJson: string | null;
  createdAt: Date;
};

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  created: { label: "创建", cls: "text-text-tertiary" },
  paused: { label: "暂停", cls: "text-amber-300" },
  resumed: { label: "恢复", cls: "text-blue-300" },
  completed: { label: "完成", cls: "text-emerald-300" },
  reopened: { label: "重新打开", cls: "text-blue-300" },
  archived: { label: "归档", cls: "text-text-tertiary" },
  status_changed: { label: "状态变更", cls: "text-text-tertiary" },
  progress_override: { label: "手动修正进度", cls: "text-amber-300" },
};

type GoalInfo = { id: string; title: string } | null;

export function GoalEventHistoryDialog({
  goal,
  onClose,
}: {
  goal: GoalInfo;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!goal) return;
    setLoading(true);
    getGoalEvents(goal.id).then((rows) => {
      setEvents(rows as EventRow[]);
      setLoading(false);
    });
  }, [goal]);

  if (!goal) return null;

  let payload: { finalScore?: number } | null = null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-lg p-6 space-y-4 mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">目标历史</h3>
        <p className="text-sm text-text-secondary">{goal.title}</p>

        {loading ? (
          <p className="text-sm text-text-tertiary">加载中…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-text-tertiary">暂无事件记录。</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const meta = TYPE_LABELS[ev.type] ?? { label: ev.type, cls: "text-text-tertiary" };
              const time = ev.createdAt instanceof Date ? ev.createdAt.toLocaleString("zh-CN") : String(ev.createdAt);

              // Parse payload
              if (ev.type === "completed" && ev.payloadJson) {
                try { payload = JSON.parse(ev.payloadJson); } catch { payload = null; }
              }

              return (
                <div key={ev.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                    <span className="text-[11px] text-text-tertiary font-mono">{time}</span>
                  </div>
                  {ev.fromStatus && ev.toStatus && (
                    <p className="text-[11px] text-text-tertiary">
                      {ev.fromStatus} → {ev.toStatus}
                    </p>
                  )}
                  {ev.note && <p className="text-xs text-text-secondary mt-1">{ev.note}</p>}
                  {ev.type === "completed" && payload?.finalScore !== undefined && (
                    <p className="text-xs text-accent mt-1">评分：{payload.finalScore}</p>
                  )}
                  {ev.reason && <p className="text-xs text-text-secondary mt-1">原因：{ev.reason}</p>}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={onClose} className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-text-secondary hover:bg-white/10 transition">
          关闭
        </button>
      </div>
    </div>
  );
}

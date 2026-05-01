"use client";

import { useEffect, useState } from "react";
import { getScheduleEvents } from "@/lib/actions/schedule";
import type { ScheduleCardItem } from "./schedule-card";

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  created: { label: "创建", cls: "text-text-tertiary" },
  started: { label: "开始", cls: "text-blue-300" },
  completed: { label: "完成", cls: "text-emerald-300" },
  delayed: { label: "延期", cls: "text-amber-300" },
  skipped: { label: "跳过", cls: "text-text-tertiary" },
  cancelled: { label: "取消", cls: "text-red-300" },
  reopened: { label: "重新打开", cls: "text-blue-300" },
  edited: { label: "编辑", cls: "text-text-tertiary" },
};

type EventRow = {
  id: string;
  scheduleItemId: string;
  type: string;
  note: string | null;
  reason: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  payloadJson: string | null;
  createdAt: Date;
};

export function EventHistoryDialog({
  item,
  onClose,
}: {
  item: ScheduleCardItem | null;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    setLoading(true);
    getScheduleEvents(item.id).then((rows) => {
      setEvents(rows as EventRow[]);
      setLoading(false);
    });
  }, [item]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-lg p-6 space-y-4 mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">事件历史</h3>
        <p className="text-sm text-text-secondary">{item.title}</p>

        {loading ? (
          <p className="text-sm text-text-tertiary">加载中…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-text-tertiary">暂无事件记录。</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const meta = TYPE_LABELS[ev.type] ?? { label: ev.type, cls: "text-text-tertiary" };
              const time = ev.createdAt instanceof Date ? ev.createdAt.toLocaleString("zh-CN") : String(ev.createdAt);
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
                  {ev.reason && <p className="text-xs text-text-secondary mt-1">原因：{ev.reason}</p>}
                  {ev.note && <p className="text-xs text-text-secondary mt-1">{ev.note}</p>}
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

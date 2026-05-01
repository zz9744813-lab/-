"use client";

import { useState } from "react";
import type { ScheduleCardItem } from "./schedule-card";

const DELAY_REASONS = [
  { key: "not_enough_time", label: "时间不够" },
  { key: "too_large", label: "任务太大" },
  { key: "priority_changed", label: "优先级变了" },
  { key: "bad_condition", label: "状态不好" },
  { key: "interrupted", label: "被打断" },
  { key: "bad_plan", label: "计划不合理" },
  { key: "other", label: "其他" },
];

export function DelayTaskDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: ScheduleCardItem | null;
  onClose: () => void;
  onConfirm: (payload: { newDate: string; newStartTime?: string; reason: string; note?: string }) => void;
}) {
  const [reason, setReason] = useState("not_enough_time");
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [note, setNote] = useState("");

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">延期任务</h3>
        <p className="text-sm text-text-secondary">{item.title}</p>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">延期原因</p>
          <div className="flex flex-wrap gap-1.5">
            {DELAY_REASONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                  reason === r.key
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                    : "border-white/10 bg-white/5 text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs text-text-tertiary">新日期</p>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="glass-input w-full text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-text-tertiary">新时间（可选）</p>
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="glass-input w-full text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">补充说明（可选）</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="还有什么想说的…"
            className="glass-input w-full text-sm min-h-[60px] resize-y"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-text-secondary hover:bg-white/10 transition">
            取消
          </button>
          <button
            onClick={() => {
              if (!newDate) return;
              onConfirm({ newDate, newStartTime: newStartTime || undefined, reason, note: note || undefined });
            }}
            disabled={!newDate}
            className="flex-1 rounded-lg border border-amber-400/30 bg-amber-500/15 py-2 text-sm text-amber-200 hover:bg-amber-500/25 transition disabled:opacity-40"
          >
            确认延期
          </button>
        </div>
      </div>
    </div>
  );
}

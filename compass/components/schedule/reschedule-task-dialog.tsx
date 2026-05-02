"use client";

import { useState } from "react";
import type { ScheduleCardItem } from "./schedule-card";

const REASONS = [
  { key: "time_conflict", label: "时间冲突" },
  { key: "not_ready", label: "准备不足" },
  { key: "priority_shift", label: "优先级变了" },
  { key: "external_dependency", label: "等外部条件" },
  { key: "other", label: "其他" },
];

export function RescheduleTaskDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: ScheduleCardItem | null;
  onClose: () => void;
  onConfirm: (payload: { newDate: string; newStartTime?: string; newEndTime?: string; reason?: string; note?: string }) => void;
}) {
  const [reason, setReason] = useState("time_conflict");
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [note, setNote] = useState("");

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">调整时间</h3>
        <p className="text-sm text-text-secondary">{item.title}</p>
        <p className="text-xs text-text-tertiary">当前：{item.date} {item.startTime || ""}{item.endTime ? ` – ${item.endTime}` : ""}</p>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">原因</p>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                  reason === r.key
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-white/10 bg-white/5 text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
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
            <p className="text-xs text-text-tertiary">开始时间</p>
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="glass-input w-full text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-text-tertiary">结束时间</p>
            <input
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className="glass-input w-full text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">备注（可选）</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
              onConfirm({
                newDate,
                newStartTime: newStartTime || undefined,
                newEndTime: newEndTime || undefined,
                reason,
                note: note || undefined,
              });
            }}
            disabled={!newDate}
            className="flex-1 rounded-lg border border-accent/30 bg-accent/15 py-2 text-sm text-accent hover:bg-accent/25 transition disabled:opacity-40"
          >
            确认调整
          </button>
        </div>
      </div>
    </div>
  );
}

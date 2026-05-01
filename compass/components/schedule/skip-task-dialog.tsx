"use client";

import { useState } from "react";
import type { ScheduleCardItem } from "./schedule-card";

const SKIP_REASONS = [
  { key: "not_needed", label: "不需要了" },
  { key: "bad_condition", label: "状态不好" },
  { key: "low_value", label: "价值不大" },
  { key: "replaced", label: "被替代了" },
  { key: "other", label: "其他" },
];

export function SkipTaskDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: ScheduleCardItem | null;
  onClose: () => void;
  onConfirm: (payload: { reason: string; note?: string }) => void;
}) {
  const [reason, setReason] = useState("not_needed");
  const [note, setNote] = useState("");

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">跳过任务</h3>
        <p className="text-sm text-text-secondary">{item.title}</p>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">跳过原因</p>
          <div className="flex flex-wrap gap-1.5">
            {SKIP_REASONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                  reason === r.key
                    ? "border-white/20 bg-white/10 text-text-primary"
                    : "border-white/10 bg-white/5 text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">补充说明（可选）</p>
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
            onClick={() => onConfirm({ reason, note: note || undefined })}
            className="flex-1 rounded-lg border border-white/20 bg-white/10 py-2 text-sm text-text-primary hover:bg-white/15 transition"
          >
            确认跳过
          </button>
        </div>
      </div>
    </div>
  );
}

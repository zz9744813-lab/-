"use client";

import { useState } from "react";
import type { ScheduleCardItem } from "./schedule-card";

const MISS_REASONS = [
  { key: "forgot", label: "忘记了" },
  { key: "not_enough_time", label: "时间不够" },
  { key: "bad_condition", label: "状态不好" },
  { key: "unclear_task", label: "任务不清晰" },
  { key: "interrupted", label: "被其他事情打断" },
  { key: "not_needed", label: "已不需要" },
  { key: "other", label: "其他" },
];

export function MissTaskDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: ScheduleCardItem | null;
  onClose: () => void;
  onConfirm: (payload: { reason: string; note?: string; reviewScore?: number }) => void;
}) {
  const [reason, setReason] = useState("forgot");
  const [note, setNote] = useState("");
  const [score, setScore] = useState(30);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">标记未完成</h3>
        <p className="text-sm text-text-secondary">{item.title}</p>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">原因</p>
          <div className="flex flex-wrap gap-1.5">
            {MISS_REASONS.map((r) => (
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

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">自评分数</p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="font-mono text-sm w-10 text-right">{score}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-text-secondary hover:bg-white/10 transition">
            取消
          </button>
          <button
            onClick={() => onConfirm({ reason, note: note || undefined, reviewScore: score })}
            className="flex-1 rounded-lg border border-white/20 bg-white/10 py-2 text-sm text-text-primary hover:bg-white/15 transition"
          >
            确认未完成
          </button>
        </div>
      </div>
    </div>
  );
}

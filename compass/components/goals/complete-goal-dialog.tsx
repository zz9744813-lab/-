"use client";

import { useState } from "react";
import type { GoalCardItem } from "./goal-card";

const QUICK_SCORES = [60, 75, 85, 95];

export function CompleteGoalDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: GoalCardItem | null;
  onClose: () => void;
  onConfirm: (payload: { finalNote: string; finalScore?: number }) => void;
}) {
  const [note, setNote] = useState("");
  const [score, setScore] = useState(85);

  if (!item) return null;

  const canConfirm = note.trim().length >= 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">确认完成目标</h3>
        <p className="text-sm text-text-secondary">{item.title}</p>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">完成总结</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="这个目标完成了什么、学到了什么、下一步是什么…"
            className="glass-input w-full text-sm min-h-[80px] resize-y"
          />
          <p className="text-[11px] text-text-tertiary">至少写 4 个字</p>
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
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_SCORES.map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  score === s
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-white/10 bg-white/5 text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-text-secondary hover:bg-white/10 transition">
            取消
          </button>
          <button
            disabled={!canConfirm}
            onClick={() => onConfirm({ finalNote: note.trim(), finalScore: score })}
            className="flex-1 rounded-lg border border-emerald-400/30 bg-emerald-500/15 py-2 text-sm text-emerald-200 hover:bg-emerald-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            确认完成
          </button>
        </div>
      </div>
    </div>
  );
}

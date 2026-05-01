"use client";

import { useState } from "react";
import type { ScheduleCardItem } from "./schedule-card";

const QUICK_SCORES = [60, 75, 85, 95];

export function CompleteTaskDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: ScheduleCardItem | null;
  onClose: () => void;
  onConfirm: (payload: { completionNote: string; reviewScore: number; partial?: boolean; quickComplete?: boolean }) => void;
}) {
  const [mode, setMode] = useState<"full" | "partial" | "quick">("full");
  const [note, setNote] = useState("");
  const [score, setScore] = useState(75);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass w-full max-w-md p-6 space-y-4 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">完成任务</h3>
        <p className="text-sm text-text-secondary">{item.title}</p>

        {/* Completion mode */}
        <div className="space-y-2">
          <p className="text-xs text-text-tertiary">完成情况</p>
          <div className="flex gap-2">
            {[
              { key: "full" as const, label: "完成了" },
              { key: "partial" as const, label: "部分完成" },
              { key: "quick" as const, label: "快速结束" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setMode(opt.key)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs transition ${
                  mode === opt.key
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-white/10 bg-white/5 text-text-secondary hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {mode !== "quick" && (
          <>
            <div className="space-y-1.5">
              <p className="text-xs text-text-tertiary">今天实际做了什么？</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="写了什么、卡在哪里、下一步是什么…"
                className="glass-input w-full text-sm min-h-[80px] resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-text-tertiary">自评评分</p>
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
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-text-secondary hover:bg-white/10 transition">
            取消
          </button>
          <button
            onClick={() =>
              onConfirm({
                completionNote: mode === "quick" ? "" : note,
                reviewScore: score,
                partial: mode === "partial",
                quickComplete: mode === "quick",
              })
            }
            className="flex-1 rounded-lg border border-accent/30 bg-accent/15 py-2 text-sm text-accent hover:bg-accent/25 transition"
          >
            确认完成
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { ScheduleCardItem } from "./schedule-card";

export function CancelTaskDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: ScheduleCardItem | null;
  onClose: () => void;
  onConfirm: (payload: { reason: string; note?: string }) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">取消任务</h3>
        <p className="text-sm text-text-secondary">{item.title}</p>

        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary">取消原因</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="为什么取消这个任务…"
            className="glass-input w-full text-sm min-h-[60px] resize-y"
          />
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
            返回
          </button>
          <button
            onClick={() => {
              if (!reason.trim()) return;
              onConfirm({ reason: reason.trim(), note: note || undefined });
            }}
            disabled={!reason.trim()}
            className="flex-1 rounded-lg border border-red-400/30 bg-red-500/15 py-2 text-sm text-red-200 hover:bg-red-500/25 transition disabled:opacity-40"
          >
            确认取消
          </button>
        </div>
      </div>
    </div>
  );
}

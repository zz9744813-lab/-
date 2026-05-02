"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  History,
  CalendarClock,
} from "lucide-react";
import { type SchedulePhase, getPhaseBadge } from "@/lib/schedule/phase";

export type ScheduleCardItem = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  source: string;
  completedAt: string | null;
  completionNote: string | null;
  reviewScore: number | null;
  quickComplete: boolean;
  delayReason: string | null;
  skipReason: string | null;
  cancelReason: string | null;
  phase: SchedulePhase;
};

const PRIORITY_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "高", cls: "border-red-400/40 bg-red-500/15 text-red-200" },
  medium: { label: "中", cls: "border-blue-400/40 bg-blue-500/15 text-blue-200" },
  low: { label: "低", cls: "border-white/10 bg-white/5 text-text-tertiary" },
};

type ActionConfig = {
  label: string;
  icon: React.ReactNode;
  tone: "primary" | "ok" | "warn" | "danger" | "muted";
  onClick: () => void;
};

export function ScheduleCard({
  item,
  onComplete,
  onMiss,
  onReschedule,
  onCancel,
  onReopen,
  onViewEvents,
}: {
  item: ScheduleCardItem;
  onComplete: () => void;
  onMiss: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onReopen: () => void;
  onViewEvents: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pBadge = PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.medium;
  const sBadge = getPhaseBadge(item.phase);

  const actions: ActionConfig[] = [];

  switch (item.phase) {
    case "future":
    case "upcoming":
      actions.push({ label: "调整时间", icon: <CalendarClock size={13} />, tone: "primary", onClick: onReschedule });
      actions.push({ label: "取消", icon: <XCircle size={13} />, tone: "danger", onClick: onCancel });
      break;
    case "active":
      actions.push({ label: "完成并复盘", icon: <CheckCircle2 size={13} />, tone: "ok", onClick: onComplete });
      actions.push({ label: "取消", icon: <XCircle size={13} />, tone: "danger", onClick: onCancel });
      break;
    case "ended_waiting_feedback":
      actions.push({ label: "填写反馈", icon: <CheckCircle2 size={13} />, tone: "ok", onClick: onComplete });
      actions.push({ label: "标记未完成", icon: <XCircle size={13} />, tone: "warn", onClick: onMiss });
      actions.push({ label: "重新安排", icon: <RotateCcw size={13} />, tone: "primary", onClick: onReschedule });
      break;
    case "done":
      actions.push({ label: "查看复盘", icon: <History size={13} />, tone: "muted", onClick: onViewEvents });
      break;
    case "missed":
      actions.push({ label: "重新安排", icon: <RotateCcw size={13} />, tone: "primary", onClick: onReschedule });
      actions.push({ label: "查看记录", icon: <History size={13} />, tone: "muted", onClick: onViewEvents });
      break;
    case "cancelled":
      actions.push({ label: "重新打开", icon: <RotateCcw size={13} />, tone: "primary", onClick: onReopen });
      actions.push({ label: "查看原因", icon: <History size={13} />, tone: "muted", onClick: onViewEvents });
      break;
  }

  const toneBtn: Record<string, string> = {
    primary: "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20",
    ok: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
    warn: "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20",
    danger: "border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20",
    muted: "border-white/10 bg-white/5 text-text-secondary hover:bg-white/10",
  };

  const isDimmed = item.phase === "done" || item.phase === "cancelled" || item.phase === "missed";

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isDimmed ? "border-white/5 opacity-60" : "border-white/10 hover:border-white/20"
      } bg-white/[0.03]`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${sBadge.cls}`}>{sBadge.label}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${pBadge.cls}`}>{pBadge.label}</span>
              {item.quickComplete && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-text-tertiary">
                  快速完成
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-text-primary truncate">{item.title}</h3>
            {(item.startTime || item.endTime) && (
              <p className="text-xs text-text-tertiary mt-1 font-mono">
                {item.startTime || ""}{item.endTime ? ` – ${item.endTime}` : ""}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-text-tertiary font-mono">{item.date}</p>
            {item.reviewScore !== null && (
              <p className="text-xs text-accent mt-1">{item.reviewScore}分</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${toneBtn[a.tone]}`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>

        {/* Expandable details */}
        {(item.description || item.completionNote || item.delayReason || item.skipReason || item.cancelReason) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "收起" : "详情"}
          </button>
        )}

        {expanded && (
          <div className="mt-2 space-y-2 text-xs text-text-secondary border-t border-white/5 pt-2">
            {item.description && (
              <div><span className="text-text-tertiary">描述：</span>{item.description}</div>
            )}
            {item.completionNote && (
              <div><span className="text-text-tertiary">完成反馈：</span>{item.completionNote}</div>
            )}
            {(item.delayReason || item.skipReason) && (
              <div><span className="text-text-tertiary">原因：</span>{item.delayReason || item.skipReason}</div>
            )}
            {item.cancelReason && (
              <div><span className="text-text-tertiary">取消原因：</span>{item.cancelReason}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Pause,
  Play,
  CheckCircle2,
  RotateCcw,
  Archive,
  ChevronDown,
  ChevronUp,
  History,
  Target,
  Sparkles,
} from "lucide-react";

export type GoalCardItem = {
  id: string;
  title: string;
  description: string | null;
  dimension: string;
  status: string;
  targetDate: string | null;
  legacyProgress: number;
  computedProgress: number;
  evidenceCount: number;
  doneScheduleCount: number;
  totalScheduleCount: number;
  progressSource: string;
  progressWarnings: string[];
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: "进行中", cls: "border-blue-400/40 bg-blue-500/15 text-blue-200" },
  paused: { label: "已暂停", cls: "border-white/10 bg-white/5 text-text-tertiary" },
  completed: { label: "已完成", cls: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" },
  archived: { label: "已归档", cls: "border-white/10 bg-white/5 text-text-tertiary line-through" },
};

type ActionConfig = {
  label: string;
  icon: React.ReactNode;
  tone: "primary" | "ok" | "warn" | "danger" | "muted";
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
};

export function GoalCard({
  goal,
  onPause,
  onResume,
  onComplete,
  onReopen,
  onArchive,
  onViewEvents,
  onHermesBreakdown,
}: {
  goal: GoalCardItem;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onArchive: () => void;
  onViewEvents: () => void;
  onHermesBreakdown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sBadge = STATUS_BADGE[goal.status] ?? STATUS_BADGE.active;

  const actions: ActionConfig[] = [];

  switch (goal.status) {
    case "active":
      actions.push({ label: "暂停", icon: <Pause size={13} />, tone: "warn", onClick: onPause });
      actions.push({ label: "确认完成", icon: <CheckCircle2 size={13} />, tone: "ok", onClick: onComplete });
      actions.push({ label: "Hermes 拆解", icon: <Sparkles size={13} />, tone: "primary", onClick: onHermesBreakdown, disabled: true, tooltip: "即将支持" });
      break;
    case "paused":
      actions.push({ label: "恢复", icon: <Play size={13} />, tone: "primary", onClick: onResume });
      actions.push({ label: "归档", icon: <Archive size={13} />, tone: "muted", onClick: onArchive });
      break;
    case "completed":
      actions.push({ label: "查看记录", icon: <History size={13} />, tone: "muted", onClick: onViewEvents });
      actions.push({ label: "重新打开", icon: <RotateCcw size={13} />, tone: "primary", onClick: onReopen });
      break;
    case "archived":
      actions.push({ label: "重新打开", icon: <RotateCcw size={13} />, tone: "primary", onClick: onReopen });
      break;
  }

  const toneBtn: Record<string, string> = {
    primary: "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20",
    ok: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
    warn: "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20",
    danger: "border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20",
    muted: "border-white/10 bg-white/5 text-text-secondary hover:bg-white/10",
  };

  const isDimmed = goal.status === "completed" || goal.status === "archived" || goal.status === "paused";

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isDimmed ? "border-white/5 opacity-70" : "border-white/10 hover:border-white/20"
      } bg-white/[0.03]`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${sBadge.cls}`}>{sBadge.label}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-text-tertiary">
                {goal.dimension}
              </span>
            </div>
            <h3 className="text-sm font-medium text-text-primary">{goal.title}</h3>
          </div>
          {goal.targetDate && (
            <div className="text-right shrink-0">
              <p className="text-xs text-text-tertiary font-mono">{goal.targetDate}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-tertiary">系统进度</span>
            <span className="text-xs font-mono text-text-secondary">{goal.computedProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.min(100, goal.computedProgress)}%` }}
            />
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">
            {goal.progressSource}
            {goal.evidenceCount > 0 && ` (${goal.doneScheduleCount}/${goal.totalScheduleCount})`}
          </p>
          {goal.progressWarnings.length > 0 && (
            <p className="text-[11px] text-amber-300 mt-0.5">{goal.progressWarnings[0]}</p>
          )}
          <p className="text-[11px] text-text-tertiary mt-0.5">进度由执行记录自动计算，不支持直接拖动</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              disabled={a.disabled}
              title={a.tooltip}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${toneBtn[a.tone]} ${a.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {a.icon}
              {a.label}
              {a.disabled && <span className="text-[9px] opacity-60">·</span>}
            </button>
          ))}
        </div>

        {/* Expandable details */}
        {(goal.description || goal.progressWarnings.length > 0) && (
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
            {goal.description && (
              <div><span className="text-text-tertiary">说明：</span>{goal.description}</div>
            )}
            {goal.legacyProgress > 0 && goal.progressSource === "旧手动进度" && (
              <div><span className="text-text-tertiary">旧手动进度：</span>{goal.legacyProgress}%</div>
            )}
            {goal.progressWarnings.map((w, i) => (
              <div key={i} className="text-amber-300">⚠ {w}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

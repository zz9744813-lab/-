"use client";

import { CalendarClock, CheckCircle2, Clock, AlertTriangle, Zap } from "lucide-react";

export type TodayStats = {
  total: number;
  active: number;
  endedWaitingFeedback: number;
  done: number;
  completionRate: number;
  currentTask: { title: string; startTime: string | null } | null;
  nextTask: { title: string; startTime: string | null } | null;
};

export function TodayFocusPanel({ stats }: { stats: TodayStats }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--accent), #FF8855)",
              boxShadow: "0 4px 14px var(--accent-glow)",
            }}
          >
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">今日执行面板</h2>
            <p className="text-xs text-text-tertiary">{dateStr}</p>
          </div>
        </div>
        <span className="font-mono text-2xl tabular-nums text-text-secondary">{timeStr}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-4">
        <StatCard icon={<CalendarClock size={14} />} label="今日任务" value={stats.total} />
        <StatCard icon={<Clock size={14} />} label="进行中" value={stats.active} tone="info" />
        <StatCard icon={<AlertTriangle size={14} />} label="待反馈" value={stats.endedWaitingFeedback} tone="warn" />
        <StatCard icon={<CheckCircle2 size={14} />} label="已完成" value={stats.done} tone="ok" />
        <StatCard
          icon={<CheckCircle2 size={14} />}
          label="完成率"
          value={`${Math.round(stats.completionRate * 100)}%`}
          tone={stats.completionRate >= 0.8 ? "ok" : stats.completionRate >= 0.5 ? "info" : "warn"}
        />
      </div>

      {stats.endedWaitingFeedback > 0 ? (
        <div className="rounded-lg border border-orange-400/20 bg-orange-500/5 p-3">
          <p className="text-sm text-orange-200">有 {stats.endedWaitingFeedback} 项任务已结束，等待你的反馈</p>
        </div>
      ) : stats.currentTask ? (
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3">
          <p className="text-xs text-text-tertiary mb-1">当前任务</p>
          <p className="text-sm font-medium text-text-primary">{stats.currentTask.title}</p>
          {stats.currentTask.startTime && <p className="text-xs text-text-secondary mt-1">{stats.currentTask.startTime}</p>}
        </div>
      ) : stats.nextTask ? (
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
          <p className="text-xs text-text-tertiary mb-1">下一项任务</p>
          <p className="text-sm font-medium text-text-primary">{stats.nextTask.title}</p>
          {stats.nextTask.startTime && <p className="text-xs text-text-secondary mt-1">{stats.nextTask.startTime}</p>}
        </div>
      ) : stats.total === 0 ? (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-sm text-text-secondary">
          今天没有安排。在总览跟 Hermes 说一句话就能创建日程。
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3 text-sm text-emerald-200">
          今天的任务全部完成！
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "ok" | "info" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "info"
        ? "text-blue-300"
        : tone === "warn"
          ? "text-amber-300"
          : "text-text-primary";

  return (
    <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-text-tertiary mb-1">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <p className={`font-mono text-lg tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export type SchedulePhase =
  | "future"          // 未来日期，还没到当天
  | "upcoming"        // 今天，还没到开始时间
  | "active"          // 当前时间在 startTime 和 endTime 之间
  | "ended_waiting_feedback" // 已过 endTime，但没有完成反馈
  | "done"            // 已完成
  | "missed"          // 未完成/错过
  | "cancelled";      // 已取消

export type SchedulePhaseItem = {
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  completedAt: string | null;
  completionNote: string | null;
};

const PHASE_BADGE: Record<SchedulePhase, { label: string; cls: string }> = {
  future: { label: "未来安排", cls: "border-white/10 bg-white/5 text-text-tertiary" },
  upcoming: { label: "未开始", cls: "border-blue-400/40 bg-blue-500/15 text-blue-200" },
  active: { label: "进行中", cls: "border-amber-400/40 bg-amber-500/15 text-amber-200" },
  ended_waiting_feedback: { label: "已结束·待反馈", cls: "border-orange-400/40 bg-orange-500/15 text-orange-200" },
  done: { label: "已完成", cls: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" },
  missed: { label: "未完成", cls: "border-white/10 bg-white/5 text-text-tertiary" },
  cancelled: { label: "已取消", cls: "border-white/10 bg-white/5 text-text-tertiary line-through" },
};

export function getPhaseBadge(phase: SchedulePhase): { label: string; cls: string } {
  return PHASE_BADGE[phase];
}

function parseTime(dateStr: string, timeStr: string | null): Date | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function getSchedulePhase(item: SchedulePhaseItem, now: Date = new Date()): SchedulePhase {
  // Terminal statuses take precedence
  if (item.status === "done") return "done";
  if (item.status === "cancelled") return "cancelled";
  if (item.status === "missed" || item.status === "skipped") return "missed";

  // Old status compatibility: delayed and in_progress are treated as open tasks
  // We compute phase from time, not from these old statuses

  const today = now.toISOString().slice(0, 10);

  // Future date (not today)
  if (item.date > today) return "future";

  // Past date (not today) without completion
  if (item.date < today) {
    if (item.completedAt) return "done";
    return "ended_waiting_feedback";
  }

  // Today - compute from time
  const startTime = parseTime(item.date, item.startTime);
  const endTime = parseTime(item.date, item.endTime);

  if (!startTime && !endTime) {
    // No time set - treat as upcoming for today
    return "upcoming";
  }

  if (startTime && now < startTime) {
    return "upcoming";
  }

  if (startTime && endTime && now >= startTime && now < endTime) {
    return "active";
  }

  if (endTime && now >= endTime) {
    // Past end time - check if there's feedback
    if (item.completedAt || item.completionNote) return "done";
    return "ended_waiting_feedback";
  }

  if (startTime && !endTime && now >= startTime) {
    // Has start time but no end time, and we're past start
    if (item.completedAt || item.completionNote) return "done";
    return "active"; // Still active if no end time
  }

  return "upcoming";
}

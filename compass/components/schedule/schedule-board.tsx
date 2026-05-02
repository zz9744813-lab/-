"use client";

import { useState } from "react";
import { ScheduleCard, type ScheduleCardItem } from "./schedule-card";
import { CompleteTaskDialog } from "./complete-task-dialog";
import { RescheduleTaskDialog } from "./reschedule-task-dialog";
import { MissTaskDialog } from "./miss-task-dialog";
import { CancelTaskDialog } from "./cancel-task-dialog";
import { EventHistoryDialog } from "./event-history-dialog";
import {
  completeScheduleItem,
  missScheduleItem,
  rescheduleScheduleItem,
  cancelScheduleItem,
  reopenScheduleItem,
} from "@/lib/actions/schedule";

type GroupKey = "active" | "ended_waiting" | "today_upcoming" | "future" | "done" | "missed_cancelled";

const GROUP_ORDER: { key: GroupKey; label: string }[] = [
  { key: "active", label: "现在" },
  { key: "ended_waiting", label: "待反馈" },
  { key: "today_upcoming", label: "今天稍后" },
  { key: "future", label: "未来" },
  { key: "done", label: "已完成" },
  { key: "missed_cancelled", label: "未完成/已取消" },
];

function groupItems(items: ScheduleCardItem[]): Record<GroupKey, ScheduleCardItem[]> {
  const groups: Record<GroupKey, ScheduleCardItem[]> = {
    active: [],
    ended_waiting: [],
    today_upcoming: [],
    future: [],
    done: [],
    missed_cancelled: [],
  };

  for (const item of items) {
    switch (item.phase) {
      case "active":
        groups.active.push(item);
        break;
      case "ended_waiting_feedback":
        groups.ended_waiting.push(item);
        break;
      case "upcoming":
      case "no_time":
        groups.today_upcoming.push(item);
        break;
      case "future":
        groups.future.push(item);
        break;
      case "done":
        groups.done.push(item);
        break;
      case "missed":
      case "cancelled":
        groups.missed_cancelled.push(item);
        break;
    }
  }

  return groups;
}

export function ScheduleBoard({ items }: { items: ScheduleCardItem[] }) {
  const [completeTarget, setCompleteTarget] = useState<ScheduleCardItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleCardItem | null>(null);
  const [missTarget, setMissTarget] = useState<ScheduleCardItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ScheduleCardItem | null>(null);
  const [eventsTarget, setEventsTarget] = useState<ScheduleCardItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        暂无日程。在总览跟 Hermes 说一句话就能创建日程。
      </div>
    );
  }

  const groups = groupItems(items);

  return (
    <>
      <div className="space-y-6">
        {GROUP_ORDER.map(({ key, label }) => {
          const group = groups[key];
          if (group.length === 0) return null;
          const isCollapsed = key === "done" || key === "missed_cancelled";

          return (
            <details key={key} open={!isCollapsed}>
              <summary className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                <span className="font-mono text-sm text-text-secondary">{label}</span>
                <span className="text-xs text-text-tertiary">{group.length} 条</span>
              </summary>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((item) => (
                  <ScheduleCard
                    key={item.id}
                    item={item}
                    onComplete={() => setCompleteTarget(item)}
                    onMiss={() => setMissTarget(item)}
                    onReschedule={() => setRescheduleTarget(item)}
                    onCancel={() => setCancelTarget(item)}
                    onReopen={() => reopenScheduleItem(item.id, { reason: "重新打开" })}
                    onViewEvents={() => setEventsTarget(item)}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <CompleteTaskDialog
        item={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onConfirm={(payload) => {
          if (completeTarget) completeScheduleItem(completeTarget.id, payload);
          setCompleteTarget(null);
        }}
      />

      <RescheduleTaskDialog
        item={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={(payload) => {
          if (rescheduleTarget) rescheduleScheduleItem(rescheduleTarget.id, payload);
          setRescheduleTarget(null);
        }}
      />

      <MissTaskDialog
        item={missTarget}
        onClose={() => setMissTarget(null)}
        onConfirm={(payload) => {
          if (missTarget) missScheduleItem(missTarget.id, payload);
          setMissTarget(null);
        }}
      />

      <CancelTaskDialog
        item={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(payload) => {
          if (cancelTarget) cancelScheduleItem(cancelTarget.id, payload);
          setCancelTarget(null);
        }}
      />

      <EventHistoryDialog item={eventsTarget} onClose={() => setEventsTarget(null)} />
    </>
  );
}

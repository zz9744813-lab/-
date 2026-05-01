"use client";

import { useState } from "react";
import { ScheduleCard, type ScheduleCardItem } from "./schedule-card";
import { CompleteTaskDialog } from "./complete-task-dialog";
import { DelayTaskDialog } from "./delay-task-dialog";
import { SkipTaskDialog } from "./skip-task-dialog";
import { CancelTaskDialog } from "./cancel-task-dialog";
import { EventHistoryDialog } from "./event-history-dialog";
import {
  startScheduleItem,
  completeScheduleItem,
  delayScheduleItem,
  skipScheduleItem,
  cancelScheduleItem,
  reopenScheduleItem,
} from "@/lib/actions/schedule";

export function ScheduleBoard({ items }: { items: ScheduleCardItem[] }) {
  const [completeTarget, setCompleteTarget] = useState<ScheduleCardItem | null>(null);
  const [delayTarget, setDelayTarget] = useState<ScheduleCardItem | null>(null);
  const [skipTarget, setSkipTarget] = useState<ScheduleCardItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ScheduleCardItem | null>(null);
  const [eventsTarget, setEventsTarget] = useState<ScheduleCardItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        暂无日程。在总览跟 Hermes 说一句话就能创建日程。
      </div>
    );
  }

  // Group by date
  const grouped = items.reduce<Record<string, ScheduleCardItem[]>>((acc, item) => {
    (acc[item.date] ??= []).push(item);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();

  return (
    <>
      <div className="space-y-6">
        {dates.map((date) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-sm text-text-secondary">{date}</span>
              <span className="text-xs text-text-tertiary">{grouped[date].length} 条</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[date].map((item) => (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  onStart={() => startScheduleItem(item.id)}
                  onComplete={() => setCompleteTarget(item)}
                  onDelay={() => setDelayTarget(item)}
                  onSkip={() => setSkipTarget(item)}
                  onCancel={() => setCancelTarget(item)}
                  onReopen={() => reopenScheduleItem(item.id, { reason: "重新打开" })}
                  onViewEvents={() => setEventsTarget(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <CompleteTaskDialog
        item={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onConfirm={(payload) => {
          if (completeTarget) completeScheduleItem(completeTarget.id, payload);
          setCompleteTarget(null);
        }}
      />

      <DelayTaskDialog
        item={delayTarget}
        onClose={() => setDelayTarget(null)}
        onConfirm={(payload) => {
          if (delayTarget) delayScheduleItem(delayTarget.id, payload);
          setDelayTarget(null);
        }}
      />

      <SkipTaskDialog
        item={skipTarget}
        onClose={() => setSkipTarget(null)}
        onConfirm={(payload) => {
          if (skipTarget) skipScheduleItem(skipTarget.id, payload);
          setSkipTarget(null);
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

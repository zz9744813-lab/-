"use client";

import { useState } from "react";
import { GoalCard, type GoalCardItem } from "./goal-card";
import { CompleteGoalDialog } from "./complete-goal-dialog";
import { EventHistoryDialog } from "@/components/schedule/event-history-dialog";
import {
  pauseGoal,
  resumeGoal,
  completeGoal,
  reopenGoal,
  archiveGoal,
} from "@/lib/actions/goals";

export function GoalsBoard({ goals }: { goals: GoalCardItem[] }) {
  const [completeTarget, setCompleteTarget] = useState<GoalCardItem | null>(null);
  const [eventsTarget, setEventsTarget] = useState<GoalCardItem | null>(null);

  if (goals.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        暂无目标。先创建一个你真正想完成的目标。
      </div>
    );
  }

  // Group by status
  const active = goals.filter((g) => g.status === "active");
  const paused = goals.filter((g) => g.status === "paused");
  const completed = goals.filter((g) => g.status === "completed");
  const archived = goals.filter((g) => g.status === "archived");

  return (
    <>
      <div className="space-y-6">
        {active.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-sm text-text-secondary">进行中</span>
              <span className="text-xs text-text-tertiary">{active.length} 个</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPause={() => pauseGoal(goal.id)}
                  onResume={() => resumeGoal(goal.id)}
                  onComplete={() => setCompleteTarget(goal)}
                  onReopen={() => reopenGoal(goal.id)}
                  onArchive={() => archiveGoal(goal.id)}
                  onViewEvents={() => setEventsTarget(goal)}
                  onHermesBreakdown={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {paused.length > 0 && (
          <details>
            <summary className="flex items-center gap-2 mb-3 cursor-pointer select-none">
              <span className="font-mono text-sm text-text-secondary">已暂停</span>
              <span className="text-xs text-text-tertiary">{paused.length} 个</span>
            </summary>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paused.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPause={() => pauseGoal(goal.id)}
                  onResume={() => resumeGoal(goal.id)}
                  onComplete={() => setCompleteTarget(goal)}
                  onReopen={() => reopenGoal(goal.id)}
                  onArchive={() => archiveGoal(goal.id)}
                  onViewEvents={() => setEventsTarget(goal)}
                  onHermesBreakdown={() => {}}
                />
              ))}
            </div>
          </details>
        )}

        {completed.length > 0 && (
          <details>
            <summary className="flex items-center gap-2 mb-3 cursor-pointer select-none">
              <span className="font-mono text-sm text-text-secondary">已完成</span>
              <span className="text-xs text-text-tertiary">{completed.length} 个</span>
            </summary>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPause={() => pauseGoal(goal.id)}
                  onResume={() => resumeGoal(goal.id)}
                  onComplete={() => setCompleteTarget(goal)}
                  onReopen={() => reopenGoal(goal.id)}
                  onArchive={() => archiveGoal(goal.id)}
                  onViewEvents={() => setEventsTarget(goal)}
                  onHermesBreakdown={() => {}}
                />
              ))}
            </div>
          </details>
        )}

        {archived.length > 0 && (
          <details>
            <summary className="flex items-center gap-2 mb-3 cursor-pointer select-none">
              <span className="font-mono text-sm text-text-secondary">已归档</span>
              <span className="text-xs text-text-tertiary">{archived.length} 个</span>
            </summary>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onPause={() => pauseGoal(goal.id)}
                  onResume={() => resumeGoal(goal.id)}
                  onComplete={() => setCompleteTarget(goal)}
                  onReopen={() => reopenGoal(goal.id)}
                  onArchive={() => archiveGoal(goal.id)}
                  onViewEvents={() => setEventsTarget(goal)}
                  onHermesBreakdown={() => {}}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      <CompleteGoalDialog
        item={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onConfirm={(payload) => {
          if (completeTarget) completeGoal(completeTarget.id, payload);
          setCompleteTarget(null);
        }}
      />

      <EventHistoryDialog item={eventsTarget} onClose={() => setEventsTarget(null)} />
    </>
  );
}

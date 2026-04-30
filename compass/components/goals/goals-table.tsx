"use client";

import { adjustGoalProgress, deleteGoal, updateGoalField } from "@/lib/actions/goals";
import {
  InlineDate,
  InlineSelect,
  InlineText,
  ProgressStepper,
  RowAction,
} from "@/components/datatable/inline-cell";

export type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  dimension: string;
  progress: number;
  status: string;
  targetDate: string | null;
};

const STATUS_OPTIONS = [
  { value: "active", label: "进行中", tone: "info" as const },
  { value: "completed", label: "已完成", tone: "ok" as const },
  { value: "paused", label: "暂停", tone: "muted" as const },
];

export function GoalsTable({ rows }: { rows: GoalRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        暂无目标。先创建一个你真正想完成的目标。
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-text-tertiary">
              <th className="px-4 py-3 font-medium">标题</th>
              <th className="px-4 py-3 font-medium">维度</th>
              <th className="px-4 py-3 font-medium">进度</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">截止</th>
              <th className="px-4 py-3 font-medium">说明</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                <td className="px-4 py-2 align-top min-w-[180px]">
                  <InlineText
                    id={row.id}
                    value={row.title}
                    save={(id, value) => updateGoalField(id, "title", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top min-w-[100px]">
                  <InlineText
                    id={row.id}
                    value={row.dimension}
                    save={(id, value) => updateGoalField(id, "dimension", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <ProgressStepper
                    id={row.id}
                    value={row.progress}
                    save={(id, delta) => adjustGoalProgress(id, delta)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineSelect
                    id={row.id}
                    value={row.status}
                    options={STATUS_OPTIONS}
                    save={(id, value) => updateGoalField(id, "status", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineDate
                    id={row.id}
                    value={row.targetDate}
                    save={(id, value) => updateGoalField(id, "targetDate", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top max-w-[280px]">
                  <InlineText
                    id={row.id}
                    value={row.description}
                    placeholder="点击补充说明…"
                    multiline
                    save={(id, value) => updateGoalField(id, "description", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top text-right">
                  <RowAction
                    label="删除"
                    tone="danger"
                    confirm={`确认删除目标「${row.title}」?`}
                    onClick={() => deleteGoal(row.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

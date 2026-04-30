"use client";

import { deleteHabit, toggleHabitToday, updateHabitField } from "@/lib/actions/habits";
import { InlineSelect, InlineText, RowAction } from "@/components/datatable/inline-cell";

export type HabitRow = {
  id: string;
  name: string;
  frequency: string;
  status: string;
  doneToday: boolean;
  last7: number;
};

const STATUS_OPTIONS = [
  { value: "active", label: "进行中", tone: "info" as const },
  { value: "paused", label: "暂停", tone: "muted" as const },
  { value: "archived", label: "已归档", tone: "muted" as const },
];

export function HabitsTable({ rows }: { rows: HabitRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        暂无习惯。先创建一个每天可执行的小动作。
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-text-tertiary">
              <th className="px-4 py-3 font-medium">习惯</th>
              <th className="px-4 py-3 font-medium">频率</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">今日</th>
              <th className="px-4 py-3 font-medium">最近 7 天</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                <td className="px-4 py-2 align-top min-w-[220px]">
                  <InlineText
                    id={row.id}
                    value={row.name}
                    save={(id, value) => updateHabitField(id, "name", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top min-w-[100px]">
                  <InlineText
                    id={row.id}
                    value={row.frequency}
                    save={(id, value) => updateHabitField(id, "frequency", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineSelect
                    id={row.id}
                    value={row.status}
                    options={STATUS_OPTIONS}
                    save={(id, value) => updateHabitField(id, "status", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <button
                    type="button"
                    onClick={() => toggleHabitToday(row.id)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
                      row.doneToday
                        ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                        : "border-white/10 text-text-tertiary hover:bg-white/5"
                    }`}
                    aria-label={row.doneToday ? "取消今日打卡" : "今日打卡"}
                  >
                    {row.doneToday ? "✓" : ""}
                  </button>
                </td>
                <td className="px-4 py-2 align-top">
                  <span className="font-mono tabular-nums text-text-secondary">{row.last7} / 7</span>
                </td>
                <td className="px-4 py-2 align-top text-right">
                  <RowAction
                    label="删除"
                    tone="danger"
                    confirm={`确认删除习惯「${row.name}」?`}
                    onClick={() => deleteHabit(row.id)}
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

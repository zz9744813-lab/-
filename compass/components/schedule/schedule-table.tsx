"use client";

import { deleteScheduleItem, updateScheduleField } from "@/lib/actions/schedule";
import {
  InlineDate,
  InlineSelect,
  InlineText,
  RowAction,
} from "@/components/datatable/inline-cell";

export type ScheduleRow = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  source: string;
  reminderEmail: string | null;
  reminderMinutes: number;
  reminderSentAt: string | null;
  completedAt: string | null;
  completionNote: string | null;
  reviewScore: number | null;
};

const PRIORITY_OPTIONS = [
  { value: "high", label: "高", tone: "accent" as const },
  { value: "medium", label: "中", tone: "info" as const },
  { value: "low", label: "低", tone: "muted" as const },
];

const STATUS_OPTIONS = [
  { value: "planned", label: "未完成", tone: "info" as const },
  { value: "done", label: "已完成", tone: "ok" as const },
  { value: "cancelled", label: "已取消", tone: "muted" as const },
];

function timeRange(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  if (start && !end) return start;
  if (!start && end) return end;
  return `${start} – ${end}`;
}

function reminderLabel(row: ScheduleRow) {
  if (!row.reminderEmail) return "未开启";
  return `${row.reminderMinutes} 分钟前`;
}

export function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        暂无日程。在总览发对话或上传文件后,Hermes 会主动给你排日程。
      </div>
    );
  }

  // group by date
  const grouped = rows.reduce<Record<string, ScheduleRow[]>>((acc, row) => {
    (acc[row.date] ??= []).push(row);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {dates.map((date) => (
        <div key={date} className="glass overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <span className="font-mono text-sm text-text-secondary">{date}</span>
            <span className="text-xs text-text-tertiary">{grouped[date].length} 条</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-text-tertiary">
                  <th className="px-4 py-2 font-medium w-[140px]">时间</th>
                  <th className="px-4 py-2 font-medium">标题</th>
                  <th className="px-4 py-2 font-medium">优先级</th>
                  <th className="px-4 py-2 font-medium">状态</th>
                  <th className="px-4 py-2 font-medium">邮件提醒</th>
                  <th className="px-4 py-2 font-medium">完成反馈</th>
                  <th className="px-4 py-2 font-medium">日期</th>
                  <th className="px-4 py-2 font-medium">来源</th>
                  <th className="px-4 py-2 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {grouped[date].map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-white/5 transition hover:bg-white/[0.02] ${
                      row.status === "cancelled" ? "opacity-50 line-through" : ""
                    } ${row.status === "done" ? "opacity-70" : ""}`}
                  >
                    <td className="px-4 py-2 align-top">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-mono text-xs text-text-secondary">{timeRange(row.startTime, row.endTime)}</div>
                        <div className="flex gap-1">
                          <InlineText
                            id={row.id}
                            value={row.startTime}
                            placeholder="开始"
                            save={(id, value) => updateScheduleField(id, "startTime", value)}
                            className="!w-16 !py-0.5 text-xs"
                          />
                          <InlineText
                            id={row.id}
                            value={row.endTime}
                            placeholder="结束"
                            save={(id, value) => updateScheduleField(id, "endTime", value)}
                            className="!w-16 !py-0.5 text-xs"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 align-top min-w-[220px]">
                      <InlineText
                        id={row.id}
                        value={row.title}
                        save={(id, value) => updateScheduleField(id, "title", value)}
                      />
                      {row.description && (
                        <div className="mt-1">
                          <InlineText
                            id={row.id}
                            value={row.description}
                            multiline
                            save={(id, value) => updateScheduleField(id, "description", value)}
                            className="!text-xs !text-text-tertiary"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <InlineSelect
                        id={row.id}
                        value={row.priority}
                        options={PRIORITY_OPTIONS}
                        save={(id, value) => updateScheduleField(id, "priority", value)}
                      />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <InlineSelect
                        id={row.id}
                        value={row.status}
                        options={STATUS_OPTIONS}
                        save={(id, value) => updateScheduleField(id, "status", value)}
                      />
                      {row.completedAt ? <p className="mt-1 text-[11px] text-text-tertiary">已记录完成时间</p> : null}
                    </td>
                    <td className="px-4 py-2 align-top min-w-[220px]">
                      <InlineText
                        id={row.id}
                        value={row.reminderEmail}
                        placeholder="填写邮箱开启"
                        save={(id, value) => updateScheduleField(id, "reminderEmail", value)}
                        className="!text-xs"
                      />
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-text-tertiary">
                        <span>{reminderLabel(row)}</span>
                        <InlineText
                          id={row.id}
                          value={String(row.reminderMinutes ?? 15)}
                          placeholder="15"
                          save={(id, value) => updateScheduleField(id, "reminderMinutes", value)}
                          className="!w-14 !py-0.5 !text-xs"
                        />
                      </div>
                      {row.reminderSentAt ? <p className="mt-1 text-[11px] text-emerald-300">已发送提醒</p> : null}
                    </td>
                    <td className="px-4 py-2 align-top min-w-[220px]">
                      <InlineText
                        id={row.id}
                        value={row.completionNote}
                        placeholder="完成后写一句反馈"
                        multiline
                        save={(id, value) => updateScheduleField(id, "completionNote", value)}
                        className="!text-xs"
                      />
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-text-tertiary">
                        <span>评分</span>
                        <InlineText
                          id={row.id}
                          value={row.reviewScore === null ? "" : String(row.reviewScore)}
                          placeholder="0-100"
                          save={(id, value) => updateScheduleField(id, "reviewScore", value)}
                          className="!w-16 !py-0.5 !text-xs"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <InlineDate
                        id={row.id}
                        value={row.date}
                        save={(id, value) => updateScheduleField(id, "date", value)}
                      />
                    </td>
                    <td className="px-4 py-2 align-top">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-text-tertiary">
                        {row.source}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top text-right">
                      <RowAction
                        label="删除"
                        tone="danger"
                        confirm={`确认删除日程「${row.title}」?`}
                        onClick={() => deleteScheduleItem(row.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

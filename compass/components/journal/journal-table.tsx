"use client";

import { deleteJournalEntry, updateJournalField, updateJournalMood } from "@/lib/actions/journal";
import {
  InlineDate,
  InlineText,
  RowAction,
} from "@/components/datatable/inline-cell";
import { useTransition } from "react";

export type JournalRow = {
  id: string;
  date: string;
  title: string | null;
  content: string;
  mood: number | null;
  tags: string | null;
};

const MOOD_LEVELS = [
  { value: 1, label: "😞", tone: "rose" },
  { value: 2, label: "😕", tone: "amber" },
  { value: 3, label: "😐", tone: "slate" },
  { value: 4, label: "🙂", tone: "sky" },
  { value: 5, label: "😄", tone: "emerald" },
] as const;

function MoodPicker({ id, value }: { id: string; value: number | null }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-1 ${pending ? "opacity-60" : ""}`}>
      {MOOD_LEVELS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() =>
            start(async () => {
              await updateJournalMood(id, value === m.value ? null : m.value);
            })
          }
          className={`flex h-7 w-7 items-center justify-center rounded-full text-base transition ${
            value === m.value ? "bg-white/15 ring-1 ring-white/30" : "opacity-40 hover:opacity-100"
          }`}
          aria-label={`心情 ${m.value}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function JournalTable({ rows }: { rows: JournalRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        暂无日记。先写下今天最真实的一句话。
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="table-responsive">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-text-tertiary">
              <th className="px-4 py-3 font-medium w-[120px]">日期</th>
              <th className="px-4 py-3 font-medium w-[180px]">心情</th>
              <th className="px-4 py-3 font-medium w-[200px]">标题</th>
              <th className="px-4 py-3 font-medium">内容</th>
              <th className="px-4 py-3 font-medium w-[140px]">标签</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                <td className="px-4 py-2 align-top">
                  <InlineDate
                    id={row.id}
                    value={row.date}
                    save={(id, value) => updateJournalField(id, "date", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <MoodPicker id={row.id} value={row.mood} />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineText
                    id={row.id}
                    value={row.title}
                    placeholder="未命名"
                    save={(id, value) => updateJournalField(id, "title", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top max-w-[460px]">
                  <InlineText
                    id={row.id}
                    value={row.content}
                    multiline
                    save={(id, value) => updateJournalField(id, "content", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineText
                    id={row.id}
                    value={row.tags}
                    placeholder="点击加标签"
                    save={(id, value) => updateJournalField(id, "tags", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top text-right">
                  <RowAction
                    label="删除"
                    tone="danger"
                    confirm="确认删除该日记?"
                    onClick={() => deleteJournalEntry(row.id)}
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

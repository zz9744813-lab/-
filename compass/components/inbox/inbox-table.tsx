"use client";

import { deleteCapture, updateCaptureField } from "@/lib/actions/inbox";
import {
  InlineSelect,
  InlineText,
  RowAction,
} from "@/components/datatable/inline-cell";

export type InboxRow = {
  id: string;
  rawText: string;
  dimension: string | null;
  source: string;
  status: string;
  createdAt: string;
};

const STATUS_OPTIONS = [
  { value: "inbox", label: "待处理", tone: "warn" as const },
  { value: "processed", label: "已处理", tone: "ok" as const },
];

export function InboxTable({ rows }: { rows: InboxRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        收件箱为空。先记录一个想法。
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="table-responsive">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-text-tertiary">
              <th className="px-4 py-3 font-medium">内容</th>
              <th className="px-4 py-3 font-medium w-[140px]">维度</th>
              <th className="px-4 py-3 font-medium w-[120px]">状态</th>
              <th className="px-4 py-3 font-medium w-[120px]">来源</th>
              <th className="px-4 py-3 font-medium w-[160px]">时间</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-white/5 transition hover:bg-white/[0.03] ${
                  row.status === "processed" ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-2 align-top max-w-[480px]">
                  <InlineText
                    id={row.id}
                    value={row.rawText}
                    multiline
                    save={(id, value) => updateCaptureField(id, "rawText", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineText
                    id={row.id}
                    value={row.dimension}
                    placeholder="未分类"
                    save={(id, value) => updateCaptureField(id, "dimension", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineSelect
                    id={row.id}
                    value={row.status}
                    options={STATUS_OPTIONS}
                    save={(id, value) => updateCaptureField(id, "status", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-text-tertiary">
                    {row.source}
                  </span>
                </td>
                <td className="px-4 py-2 align-top font-mono text-xs text-text-tertiary">{row.createdAt}</td>
                <td className="px-4 py-2 align-top text-right">
                  <RowAction
                    label="删除"
                    tone="danger"
                    confirm="确认删除该收集项?"
                    onClick={() => deleteCapture(row.id)}
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

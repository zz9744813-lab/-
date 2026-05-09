"use client";

import {
  deleteTransaction,
  updateFinanceAmount,
  updateFinanceField,
} from "@/lib/actions/finance";
import {
  InlineDate,
  InlineSelect,
  InlineText,
  RowAction,
} from "@/components/datatable/inline-cell";

export type FinanceRow = {
  id: string;
  date: string;
  type: string;
  amount: number;
  category: string | null;
  note: string | null;
};

const TYPE_OPTIONS = [
  { value: "income", label: "收入", tone: "ok" as const },
  { value: "expense", label: "支出", tone: "warn" as const },
];

export function FinanceTable({ rows }: { rows: FinanceRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass p-10 text-center text-sm text-text-secondary">
        暂无收支记录。先添加一笔。
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="table-responsive">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-text-tertiary">
              <th className="px-4 py-3 font-medium w-[120px]">日期</th>
              <th className="px-4 py-3 font-medium w-[100px]">类型</th>
              <th className="px-4 py-3 font-medium w-[140px]">金额</th>
              <th className="px-4 py-3 font-medium w-[160px]">分类</th>
              <th className="px-4 py-3 font-medium">备注</th>
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
                    save={(id, value) => updateFinanceField(id, "date", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineSelect
                    id={row.id}
                    value={row.type}
                    options={TYPE_OPTIONS}
                    save={(id, value) => updateFinanceField(id, "type", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <span className={`inline-flex items-center gap-1 font-mono tabular-nums ${row.type === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                    <span className="text-text-tertiary">{row.type === "income" ? "+" : "−"}</span>
                    <InlineText
                      id={row.id}
                      value={row.amount.toFixed(2)}
                      save={(id, value) => updateFinanceAmount(id, value)}
                      className="!font-mono"
                    />
                  </span>
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineText
                    id={row.id}
                    value={row.category}
                    placeholder="未分类"
                    save={(id, value) => updateFinanceField(id, "category", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <InlineText
                    id={row.id}
                    value={row.note}
                    placeholder="点击补充备注…"
                    save={(id, value) => updateFinanceField(id, "note", value)}
                  />
                </td>
                <td className="px-4 py-2 align-top text-right">
                  <RowAction
                    label="删除"
                    tone="danger"
                    confirm="确认删除该笔记录?"
                    onClick={() => deleteTransaction(row.id)}
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

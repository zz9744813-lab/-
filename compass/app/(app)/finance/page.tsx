import { localDateString } from "@/lib/datetime";
import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { FinanceTable, type FinanceRow } from "@/components/finance/finance-table";
import { createTransactionAction } from "@/lib/actions/finance";
import { db } from "@/lib/db/client";
import { financeTransactions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type View = "day" | "month" | "year";

function viewRange(view: View): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (view === "day") {
    const today = `${y}-${pad(m + 1)}-${pad(d)}`;
    return { start: today, end: today, label: today };
  }
  if (view === "year") {
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `${y} 年` };
  }
  const last = new Date(y, m + 1, 0).getDate();
  return {
    start: `${y}-${pad(m + 1)}-01`,
    end: `${y}-${pad(m + 1)}-${pad(last)}`,
    label: `${y}-${pad(m + 1)}`,
  };
}

const VIEW_LABELS: Record<View, string> = { day: "日", month: "月", year: "年" };

export default async function FinancePage({ searchParams }: { searchParams?: { view?: string } }) {
  const rawView = searchParams?.view;
  const view: View = rawView === "day" || rawView === "year" ? rawView : "month";
  const { start, end, label } = viewRange(view);

  const [incomeRows, expenseRows, list, monthlyAgg, categoryAgg] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)` })
      .from(financeTransactions)
      .where(and(eq(financeTransactions.type, "income"), gte(financeTransactions.date, start), lte(financeTransactions.date, end))),
    db
      .select({ total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)` })
      .from(financeTransactions)
      .where(and(eq(financeTransactions.type, "expense"), gte(financeTransactions.date, start), lte(financeTransactions.date, end))),
    db
      .select()
      .from(financeTransactions)
      .where(and(gte(financeTransactions.date, start), lte(financeTransactions.date, end)))
      .orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt))
      .limit(500),
    view === "year"
      ? db
          .select({
            month: sql<string>`substr(${financeTransactions.date}, 1, 7)`,
            type: financeTransactions.type,
            total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)`,
          })
          .from(financeTransactions)
          .where(and(gte(financeTransactions.date, start), lte(financeTransactions.date, end)))
          .groupBy(sql`substr(${financeTransactions.date}, 1, 7)`, financeTransactions.type)
      : Promise.resolve([]),
    db
      .select({
        category: financeTransactions.category,
        total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)`,
      })
      .from(financeTransactions)
      .where(and(eq(financeTransactions.type, "expense"), gte(financeTransactions.date, start), lte(financeTransactions.date, end)))
      .groupBy(financeTransactions.category)
      .orderBy(sql`coalesce(sum(${financeTransactions.amount}), 0) desc`)
      .limit(8),
  ]);

  const income = Number(incomeRows[0]?.total ?? 0);
  const expense = Number(expenseRows[0]?.total ?? 0);
  const balance = income - expense;

  const rows: FinanceRow[] = list.map((row) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    note: row.note,
  }));

  const today = localDateString();

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-text-secondary">{label} · 钱去哪了</p>
          <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
            财务
          </h1>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          {(["day", "month", "year"] as View[]).map((v) => (
            <Link
              key={v}
              href={`/finance?view=${v}`}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                view === v
                  ? "bg-white/10 text-text-primary shadow-inner"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {VIEW_LABELS[v]}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid animate-fade-rise-delay gap-3 sm:grid-cols-3">
        <div className="glass p-5">
          <p className="text-xs uppercase tracking-wider text-text-tertiary">{label} 收入</p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-emerald-300">¥{income.toFixed(2)}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs uppercase tracking-wider text-text-tertiary">{label} 支出</p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-rose-300">¥{expense.toFixed(2)}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs uppercase tracking-wider text-text-tertiary">{label} 结余</p>
          <p className={`mt-2 font-mono text-2xl tabular-nums ${balance >= 0 ? "text-text-primary" : "text-amber-300"}`}>
            ¥{balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 年视图: 月度趋势条 */}
      {view === "year" && monthlyAgg.length > 0 && (
        <div className="glass animate-fade-rise-delay p-5">
          <p className="mb-4 text-xs uppercase tracking-wider text-text-tertiary">月度走势</p>
          <YearChart agg={monthlyAgg} />
        </div>
      )}

      {/* 分类聚合 */}
      {categoryAgg.length > 0 && (
        <div className="glass animate-fade-rise-delay p-5">
          <p className="mb-4 text-xs uppercase tracking-wider text-text-tertiary">{label} 支出分类</p>
          <CategoryBars rows={categoryAgg} total={expense} />
        </div>
      )}

      {/* 折叠的手动添加表单 */}
      <details className="glass animate-fade-rise-delay-2 p-4 [&[open]>summary]:mb-3">
        <summary className="cursor-pointer list-none text-sm text-text-secondary hover:text-text-primary">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs">+</span>
            手动添加一笔(主要请直接和 Hermes 对话或上传图片/文件,它会自动入账)
          </span>
        </summary>
        <form action={createTransactionAction} className="flex flex-wrap items-end gap-3">
          <select name="type" className="glass-input w-28 !py-2 text-sm">
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            required
            placeholder="金额"
            className="glass-input w-32 !py-2 text-sm font-mono"
          />
          <input name="category" placeholder="分类" className="glass-input w-40 !py-2 text-sm" />
          <input type="date" name="date" defaultValue={today} className="glass-input w-44 !py-2 text-sm" />
          <input
            name="note"
            placeholder="备注(可选)"
            className="glass-input flex-1 min-w-[180px] !py-2 text-sm"
          />
          <button type="submit" className="glass-btn glass-btn-primary !py-2 text-sm">
            保存
          </button>
        </form>
      </details>

      <div className="animate-fade-rise-delay-2">
        <FinanceTable rows={rows} />
      </div>
    </section>
  );
}

function CategoryBars({
  rows,
  total,
}: {
  rows: { category: string | null; total: number }[];
  total: number;
}) {
  const max = Math.max(total, 0.01);
  return (
    <ul className="space-y-2">
      {rows.map((row, idx) => {
        const pct = total > 0 ? (Number(row.total) / max) * 100 : 0;
        return (
          <li key={`${row.category ?? "uncategorized"}-${idx}`} className="flex items-center gap-3 text-sm">
            <span className="w-24 truncate text-text-secondary">{row.category || "未分类"}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400/70 to-orange-400/70"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-24 text-right font-mono tabular-nums text-text-tertiary">¥{Number(row.total).toFixed(2)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function YearChart({ agg }: { agg: { month: string; type: string; total: number }[] }) {
  const months = Array.from({ length: 12 }, (_, i) => `${new Date().getFullYear()}-${String(i + 1).padStart(2, "0")}`);
  const byMonth: Record<string, { income: number; expense: number }> = {};
  for (const m of months) byMonth[m] = { income: 0, expense: 0 };
  for (const r of agg) {
    if (byMonth[r.month]) {
      byMonth[r.month][r.type as "income" | "expense"] = Number(r.total);
    }
  }
  const max = Math.max(
    ...months.map((m) => Math.max(byMonth[m].income, byMonth[m].expense)),
    1,
  );
  return (
    <div className="grid grid-cols-12 gap-2">
      {months.map((m) => {
        const inc = byMonth[m].income;
        const exp = byMonth[m].expense;
        return (
          <div key={m} className="flex flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end gap-0.5">
              <div
                className="flex-1 rounded-t bg-emerald-400/60"
                style={{ height: `${(inc / max) * 100}%`, minHeight: inc > 0 ? "2px" : "0" }}
                title={`收入 ¥${inc.toFixed(2)}`}
              />
              <div
                className="flex-1 rounded-t bg-rose-400/60"
                style={{ height: `${(exp / max) * 100}%`, minHeight: exp > 0 ? "2px" : "0" }}
                title={`支出 ¥${exp.toFixed(2)}`}
              />
            </div>
            <span className="font-mono text-[10px] text-text-tertiary">{m.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

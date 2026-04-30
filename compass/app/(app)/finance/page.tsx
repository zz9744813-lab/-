import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { FinanceTable, type FinanceRow } from "@/components/finance/finance-table";
import { createTransactionAction } from "@/lib/actions/finance";
import { db } from "@/lib/db/client";
import { financeTransactions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [incomeRows, expenseRows, list] = await Promise.all([
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
      .orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt))
      .limit(200),
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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">本月你的钱去哪了</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          财务
        </h1>
      </div>

      <div className="grid animate-fade-rise-delay gap-3 sm:grid-cols-3">
        <div className="glass p-5">
          <p className="text-xs uppercase tracking-wider text-text-tertiary">本月收入</p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-emerald-300">¥{income.toFixed(2)}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs uppercase tracking-wider text-text-tertiary">本月支出</p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-rose-300">¥{expense.toFixed(2)}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs uppercase tracking-wider text-text-tertiary">本月结余</p>
          <p className={`mt-2 font-mono text-2xl tabular-nums ${balance >= 0 ? "text-text-primary" : "text-amber-300"}`}>
            ¥{balance.toFixed(2)}
          </p>
        </div>
      </div>

      <form action={createTransactionAction} className="glass animate-fade-rise-delay flex flex-wrap items-end gap-3 p-4">
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
          + 添加
        </button>
      </form>

      <div className="animate-fade-rise-delay-2">
        <FinanceTable rows={rows} />
      </div>
    </section>
  );
}

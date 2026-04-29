import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { financeTransactions } from "@/lib/db/schema";

async function createTransaction(formData: FormData) {
  "use server";
  const type = String(formData.get("type") ?? "expense").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const category = String(formData.get("category") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!Number.isFinite(amount) || amount <= 0) return;

  await db.insert(financeTransactions).values({ type, amount, category: category || null, note: note || null, date });
  revalidatePath("/finance");
}

async function removeTransaction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await db.delete(financeTransactions).where(eq(financeTransactions.id, id));
  revalidatePath("/finance");
}

export default async function FinancePage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [incomeRows, expenseRows, list] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)` }).from(financeTransactions).where(and(eq(financeTransactions.type, "income"), gte(financeTransactions.date, start), lte(financeTransactions.date, end))),
    db.select({ total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)` }).from(financeTransactions).where(and(eq(financeTransactions.type, "expense"), gte(financeTransactions.date, start), lte(financeTransactions.date, end))),
    db.select().from(financeTransactions).orderBy(desc(financeTransactions.date), desc(financeTransactions.createdAt)).limit(100),
  ]);

  const income = Number(incomeRows[0]?.total ?? 0);
  const expense = Number(expenseRows[0]?.total ?? 0);
  const balance = income - expense;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">财务</h1>

      <article className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-surface p-4"><p className="text-xs text-text-secondary">本月收入</p><p className="mt-1 text-xl font-mono">¥{income.toFixed(2)}</p></div>
        <div className="rounded-lg border border-border bg-bg-surface p-4"><p className="text-xs text-text-secondary">本月支出</p><p className="mt-1 text-xl font-mono">¥{expense.toFixed(2)}</p></div>
        <div className="rounded-lg border border-border bg-bg-surface p-4"><p className="text-xs text-text-secondary">本月结余</p><p className="mt-1 text-xl font-mono">¥{balance.toFixed(2)}</p></div>
      </article>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">新增收支</h2>
        <form action={createTransaction} className="mt-4 grid gap-3 md:grid-cols-5">
          <select name="type" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"><option value="income">收入</option><option value="expense">支出</option></select>
          <input type="number" name="amount" min="0.01" step="0.01" required placeholder="金额" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <input name="category" placeholder="分类（可选）" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">保存</button>
          <input name="note" placeholder="备注（可选）" className="md:col-span-5 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
        </form>
      </article>

      {list.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">暂无收支记录。先添加一笔收入或支出。</article>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm">{item.type === "income" ? "收入" : "支出"} · ¥{Number(item.amount).toFixed(2)}</p>
                  <p className="text-xs text-text-secondary">{item.date} · {item.category || "未分类"} {item.note ? `· ${item.note}` : ""}</p>
                </div>
                <form action={removeTransaction}><input type="hidden" name="id" value={item.id} /><button className="rounded-md border border-border px-3 py-1.5 text-sm text-danger">删除</button></form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

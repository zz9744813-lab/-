import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import { formatDate, formatDateInput } from "@/lib/datetime";

export const dynamic = "force-dynamic";

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, value));
}

async function createGoal(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const description = String(formData.get("description") ?? "").trim();
  const dimension = String(formData.get("dimension") ?? "成长").trim() || "成长";
  const targetDateRaw = String(formData.get("targetDate") ?? "").trim();

  await db.insert(goals).values({
    title,
    description: description || null,
    dimension,
    targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
    status: "active",
    progress: 0,
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

async function updateGoal(formData: FormData) {
  "use server";
  const goalId = String(formData.get("goalId") ?? "").trim();
  if (!goalId) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dimension = String(formData.get("dimension") ?? "成长").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const targetDateRaw = String(formData.get("targetDate") ?? "").trim();

  await db
    .update(goals)
    .set({
      title,
      description: description || null,
      dimension: dimension || "成长",
      status,
      targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, goalId));

  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

async function quickProgress(formData: FormData) {
  "use server";
  const goalId = String(formData.get("goalId") ?? "").trim();
  const delta = Number(formData.get("delta") ?? 0);
  if (!goalId) return;

  const current = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!current[0]) return;

  const next = clampProgress((current[0].progress ?? 0) + delta);
  await db
    .update(goals)
    .set({ progress: next, status: next >= 100 ? "completed" : current[0].status, updatedAt: new Date() })
    .where(eq(goals.id, goalId));

  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

async function removeGoal(formData: FormData) {
  "use server";
  const goalId = String(formData.get("goalId") ?? "").trim();
  if (!goalId) return;

  await db.delete(goals).where(eq(goals.id, goalId));
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export default async function GoalsPage({ searchParams }: { searchParams?: { edit?: string } }) {
  const editId = searchParams?.edit;
  const list = await db.select().from(goals).orderBy(desc(goals.createdAt));

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">目标</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">新建目标</h2>
        <form action={createGoal} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="title" placeholder="例如：90 天减脂" required className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <input name="dimension" defaultValue="成长" placeholder="维度" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <textarea name="description" placeholder="目标描述" rows={3} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm md:col-span-2" />
          <input type="date" name="targetDate" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm md:justify-self-start">创建目标</button>
        </form>
      </article>

      {list.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">
          暂无目标。先创建一个你真正想完成的目标。
        </article>
      ) : (
        <div className="space-y-3">
          {list.map((goal) => {
            const isEdit = editId === goal.id;
            return (
              <article key={goal.id} className="rounded-lg border border-border bg-bg-surface p-4">
                {isEdit ? (
                  <form action={updateGoal} className="space-y-3">
                    <input type="hidden" name="goalId" value={goal.id} />
                    <input name="title" defaultValue={goal.title} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                    <textarea name="description" defaultValue={goal.description ?? ""} rows={3} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input name="dimension" defaultValue={goal.dimension} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                      <select name="status" defaultValue={goal.status} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
                        <option value="active">进行中</option>
                        <option value="completed">已完成</option>
                        <option value="paused">暂停</option>
                      </select>
                      <input type="date" name="targetDate" defaultValue={formatDateInput(goal.targetDate)} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="rounded-md border border-accent bg-accent-muted px-3 py-1.5 text-sm">保存修改</button>
                      <Link href="/goals" className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary">取消</Link>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">{goal.title}</h3>
                      <p className="text-sm text-text-secondary">{goal.description || "暂无描述"}</p>
                      <p className="mt-1 text-xs text-text-secondary">
                        状态：{goal.status === "active" ? "进行中" : goal.status === "completed" ? "已完成" : "暂停"} · 截止：
                        {goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : "未设置"} · 创建于 {formatDate(goal.createdAt, "??")}
                      </p>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                        <span>进度</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded bg-bg-elevated">
                        <div className="h-full bg-accent" style={{ width: `${goal.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={quickProgress}><input type="hidden" name="goalId" value={goal.id} /><input type="hidden" name="delta" value="10" /><button className="rounded-md border border-border px-3 py-1.5 text-sm">+10%</button></form>
                      <form action={quickProgress}><input type="hidden" name="goalId" value={goal.id} /><input type="hidden" name="delta" value="-10" /><button className="rounded-md border border-border px-3 py-1.5 text-sm">-10%</button></form>
                      <Link href={`/goals?edit=${goal.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm">编辑</Link>
                      <form action={removeGoal}><input type="hidden" name="goalId" value={goal.id} /><button className="rounded-md border border-border px-3 py-1.5 text-sm text-danger">删除</button></form>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

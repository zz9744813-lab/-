import Link from "next/link";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";


export const dynamic = "force-dynamic";

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function createHabit(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "每日").trim() || "每日";
  if (!name) return;

  await db.insert(habits).values({ name, frequency, status: "active" });
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

async function updateHabit(formData: FormData) {
  "use server";
  const habitId = String(formData.get("habitId") ?? "").trim();
  if (!habitId) return;
  const name = String(formData.get("name") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "每日").trim();
  const status = String(formData.get("status") ?? "active").trim();

  await db.update(habits).set({ name, frequency, status }).where(eq(habits.id, habitId));
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

async function toggleToday(formData: FormData) {
  "use server";
  const habitId = String(formData.get("habitId") ?? "").trim();
  if (!habitId) return;

  const date = today();
  const exists = await db.select().from(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date))).limit(1);

  if (exists.length) {
    await db.delete(habitLogs).where(eq(habitLogs.id, exists[0].id));
  } else {
    await db.insert(habitLogs).values({ habitId, date, completed: true });
  }

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

async function removeHabit(formData: FormData) {
  "use server";
  const habitId = String(formData.get("habitId") ?? "").trim();
  if (!habitId) return;

  await db.delete(habitLogs).where(eq(habitLogs.habitId, habitId));
  await db.delete(habits).where(eq(habits.id, habitId));

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export default async function HabitsPage({ searchParams }: { searchParams?: { edit?: string } }) {
  const editId = searchParams?.edit;
  const list = await db.select().from(habits).orderBy(desc(habits.createdAt));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
  const todayStr = today();

  const items = await Promise.all(
    list.map(async (habit) => {
      const doneToday = await db
        .select({ id: habitLogs.id })
        .from(habitLogs)
        .where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.date, todayStr)))
        .limit(1);
      const last7 = await db
        .select({ value: count() })
        .from(habitLogs)
        .where(and(eq(habitLogs.habitId, habit.id), gte(habitLogs.date, sevenDaysAgoStr)));
      return { habit, doneToday: doneToday.length > 0, last7: last7[0]?.value ?? 0 };
    }),
  );

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">习惯</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">新建习惯</h2>
        <form action={createHabit} className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <input name="name" placeholder="例如：晚饭后散步 20 分钟" required className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <input name="frequency" defaultValue="每日" placeholder="频率" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">创建习惯</button>
        </form>
      </article>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">暂无习惯。先创建一个每天可执行的小动作。</article>
      ) : (
        <div className="space-y-3">
          {items.map(({ habit, doneToday, last7 }) => {
            const isEdit = editId === habit.id;
            return (
              <article key={habit.id} className="rounded-lg border border-border bg-bg-surface p-4">
                {isEdit ? (
                  <form action={updateHabit} className="space-y-3">
                    <input type="hidden" name="habitId" value={habit.id} />
                    <input name="name" defaultValue={habit.name} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input name="frequency" defaultValue={habit.frequency} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
                      <select name="status" defaultValue={habit.status} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
                        <option value="active">进行中</option>
                        <option value="paused">暂停</option>
                        <option value="archived">已归档</option>
                      </select>
                      <div className="flex gap-2">
                        <button type="submit" className="rounded-md border border-accent bg-accent-muted px-3 py-2 text-sm">保存</button>
                        <Link href="/habits" className="rounded-md border border-border px-3 py-2 text-sm">取消</Link>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">{habit.name}</h3>
                      <p className="text-sm text-text-secondary">
                        频率：{habit.frequency} · 状态：{habit.status === "active" ? "进行中" : habit.status === "paused" ? "暂停" : "已归档"}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">今日：{doneToday ? "已打卡" : "未打卡"} · 最近 7 天完成 {last7} 次</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={toggleToday}><input type="hidden" name="habitId" value={habit.id} /><button className="rounded-md border border-border px-3 py-1.5 text-sm">{doneToday ? "取消今日打卡" : "今日打卡"}</button></form>
                      <Link href={`/habits?edit=${habit.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm">编辑</Link>
                      <form action={removeHabit}><input type="hidden" name="habitId" value={habit.id} /><button className="rounded-md border border-border px-3 py-1.5 text-sm text-danger">删除</button></form>
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

import { and, count, desc, eq, gte } from "drizzle-orm";
import { HabitsTable, type HabitRow } from "@/components/habits/habits-table";
import { createHabitAction } from "@/lib/actions/habits";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function HabitsPage() {
  const list = await db.select().from(habits).orderBy(desc(habits.createdAt));
  const today = todayStr();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const rows: HabitRow[] = await Promise.all(
    list.map(async (habit) => {
      const doneToday = await db
        .select({ id: habitLogs.id })
        .from(habitLogs)
        .where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.date, today)))
        .limit(1);
      const last7 = await db
        .select({ value: count() })
        .from(habitLogs)
        .where(and(eq(habitLogs.habitId, habit.id), gte(habitLogs.date, sevenDaysAgoStr)));
      return {
        id: habit.id,
        name: habit.name,
        frequency: habit.frequency,
        status: habit.status,
        doneToday: doneToday.length > 0,
        last7: last7[0]?.value ?? 0,
      };
    }),
  );

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">每天可执行的小动作</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          习惯
        </h1>
      </div>

      <form action={createHabitAction} className="glass animate-fade-rise-delay flex flex-wrap items-end gap-3 p-4">
        <input
          name="name"
          required
          placeholder="新习惯…例如：晚饭后散步 20 分钟"
          className="glass-input flex-1 min-w-[260px] !py-2 text-sm"
        />
        <input
          name="frequency"
          defaultValue="每日"
          placeholder="频率"
          className="glass-input w-32 !py-2 text-sm"
        />
        <button type="submit" className="glass-btn glass-btn-primary !py-2 text-sm">
          + 添加
        </button>
      </form>

      <div className="animate-fade-rise-delay-2">
        <HabitsTable rows={rows} />
      </div>
    </section>
  );
}

import { desc, eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { habits, habitLogs } from "@/lib/db/schema";
import { localDateString } from "@/lib/datetime";
import { Repeat, Plus, Check, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

async function createHabit(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "daily");
  if (!name) return;
  await db.insert(habits).values({ name, frequency, status: "active" });
  revalidatePath("/habits");
}

async function toggleHabit(formData: FormData) {
  "use server";
  const habitId = String(formData.get("habitId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!habitId || !date) return;

  const existing = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(habitLogs).where(eq(habitLogs.id, existing[0].id));
  } else {
    await db.insert(habitLogs).values({ habitId, date, completed: true });
  }
  revalidatePath("/habits");
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }));
  }
  return days;
}

function getStreak(logs: { date: string }[]): number {
  const dates = new Set(logs.map((l) => l.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const dateStr = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    if (dates.has(dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default async function HabitsPage() {
  const today = localDateString();
  const last7 = getLast7Days();
  const weekStart = last7[0];

  const activeHabits = await db
    .select()
    .from(habits)
    .where(eq(habits.status, "active"))
    .orderBy(desc(habits.createdAt));

  const recentLogs = await db
    .select()
    .from(habitLogs)
    .where(gte(habitLogs.date, weekStart));

  const logsByHabit = new Map<string, { date: string }[]>();
  for (const log of recentLogs) {
    const arr = logsByHabit.get(log.habitId) ?? [];
    arr.push({ date: log.date });
    logsByHabit.set(log.habitId, arr);
  }

  const dayLabels = last7.map((d) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("zh-CN", { weekday: "short", timeZone: "Asia/Shanghai" });
  });

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between animate-fade-rise">
        <div>
          <p className="text-sm text-[var(--text-tertiary)] mb-1">坚持每一天</p>
          <h1 className="text-4xl font-bold tracking-tight">习惯追踪</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Flame size={16} className="text-[var(--orange)]" />
          <span>今日 {today}</span>
        </div>
      </div>

      {/* Add habit form */}
      <form action={createHabit} className="card p-4 flex gap-3 items-center animate-fade-rise-delay">
        <Plus size={18} className="text-[var(--text-tertiary)] shrink-0" />
        <input
          name="name"
          placeholder="添加新习惯..."
          className="glass-input flex-1"
          required
        />
        <select name="frequency" className="glass-input w-auto">
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
        </select>
        <button type="submit" className="glass-btn-primary px-4 py-2 text-sm rounded-xl">
          添加
        </button>
      </form>

      {/* Habits grid */}
      {activeHabits.length === 0 ? (
        <div className="empty-state animate-fade-rise-delay-2">
          <Repeat className="empty-state-icon" />
          <p className="text-lg font-medium text-[var(--text-secondary)]">还没有习惯</p>
          <p className="mt-1 text-sm">添加你想坚持的习惯，每天打卡追踪</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-rise-delay-2">
          {/* Day header */}
          <div className="grid grid-cols-[1fr_repeat(7,40px)_60px] gap-2 px-4 text-xs text-[var(--text-tertiary)]">
            <span>习惯</span>
            {dayLabels.map((d, i) => (
              <span key={i} className="text-center">{d}</span>
            ))}
            <span className="text-center">连续</span>
          </div>

          {/* Habit rows */}
          {activeHabits.map((habit) => {
            const logs = logsByHabit.get(habit.id) ?? [];
            const logDates = new Set(logs.map((l) => l.date));
            const streak = getStreak(logs);

            return (
              <div
                key={habit.id}
                className="card grid grid-cols-[1fr_repeat(7,40px)_60px] gap-2 items-center px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{habit.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {habit.frequency === "daily" ? "每天" : "每周"}
                  </p>
                </div>

                {last7.map((date) => {
                  const done = logDates.has(date);
                  const isToday = date === today;
                  return (
                    <form key={date} action={toggleHabit} className="flex justify-center">
                      <input type="hidden" name="habitId" value={habit.id} />
                      <input type="hidden" name="date" value={date} />
                      <button
                        type="submit"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                          done
                            ? "bg-[var(--green)] text-white shadow-sm"
                            : isToday
                              ? "border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--green)] hover:bg-[var(--green-muted)]"
                              : "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]"
                        }`}
                      >
                        {done && <Check size={14} strokeWidth={3} />}
                      </button>
                    </form>
                  );
                })}

                <div className="flex items-center justify-center gap-1">
                  {streak > 0 && <Flame size={14} className="text-[var(--orange)]" />}
                  <span className={`text-sm font-mono ${streak > 0 ? "text-[var(--orange)]" : "text-[var(--text-tertiary)]"}`}>
                    {streak}天
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

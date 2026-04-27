import { and, count, desc, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";

const today = new Date().toISOString().slice(0, 10);

async function createHabit(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "daily").trim() || "daily";

  if (!name) return;

  await db.insert(habits).values({
    name,
    frequency,
    status: "active",
  });

  revalidatePath("/habits");
}

async function markHabitDoneToday(formData: FormData) {
  "use server";

  const habitId = String(formData.get("habitId") ?? "").trim();
  if (!habitId) return;

  const existing = await db
    .select({ id: habitLogs.id })
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, today)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(habitLogs).values({
      habitId,
      date: today,
      completed: true,
    });
  }

  revalidatePath("/habits");
}

export default async function HabitsPage() {
  const activeHabits = await db.select().from(habits).where(eq(habits.status, "active")).orderBy(desc(habits.createdAt));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const habitCards = await Promise.all(
    activeHabits.map(async (habit) => {
      const doneToday = await db
        .select({ id: habitLogs.id })
        .from(habitLogs)
        .where(and(eq(habitLogs.habitId, habit.id), eq(habitLogs.date, today), eq(habitLogs.completed, true)))
        .limit(1);

      const completedLast7 = await db
        .select({ value: count() })
        .from(habitLogs)
        .where(
          and(
            eq(habitLogs.habitId, habit.id),
            eq(habitLogs.completed, true),
            gte(habitLogs.date, sevenDaysAgoStr),
          ),
        );

      return {
        habit,
        doneToday: doneToday.length > 0,
        completedLast7: completedLast7[0]?.value ?? 0,
      };
    }),
  );

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Habits</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">New habit</h2>
        <form action={createHabit} className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <input
            name="name"
            placeholder="Morning run"
            className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
            required
          />
          <select
            name="frequency"
            defaultValue="daily"
            className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="custom">custom</option>
          </select>
          <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm">
            Create
          </button>
        </form>
      </article>

      {habitCards.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">
          No habits yet. Create your first daily ritual.
        </article>
      ) : (
        <div className="space-y-3">
          {habitCards.map(({ habit, doneToday, completedLast7 }) => (
            <article key={habit.id} className="rounded-lg border border-border bg-bg-surface p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">{habit.name}</h3>
                  <p className="text-sm text-text-secondary">{habit.frequency}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Today: {doneToday ? "Done" : "Not yet"} · Last 7 days: {completedLast7}/7
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={markHabitDoneToday}>
                    <input type="hidden" name="habitId" value={habit.id} />
                    <button
                      type="submit"
                      disabled={doneToday}
                      className="rounded-md border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:text-text-tertiary"
                    >
                      {doneToday ? "Already done" : "Mark done today"}
                    </button>
                  </form>
                  <button type="button" className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary" disabled>
                    Archive (soon)
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

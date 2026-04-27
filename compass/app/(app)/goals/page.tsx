import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";

function clampProgress(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

async function createGoal(formData: FormData) {
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dimension = String(formData.get("dimension") ?? "goals").trim() || "goals";
  const targetDateRaw = String(formData.get("targetDate") ?? "").trim();

  if (!title) return;

  await db.insert(goals).values({
    title,
    description: description || null,
    dimension,
    targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
    status: "active",
    progress: 0,
  });

  revalidatePath("/goals");
}

async function updateGoalProgress(formData: FormData) {
  "use server";

  const goalId = String(formData.get("goalId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();

  if (!goalId) return;

  const existing = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  const goal = existing[0];
  if (!goal) return;

  let nextProgress = goal.progress;
  if (action === "plus") nextProgress = clampProgress(goal.progress + 10);
  if (action === "minus") nextProgress = clampProgress(goal.progress - 10);
  if (action === "complete") nextProgress = 100;

  await db
    .update(goals)
    .set({
      progress: nextProgress,
      status: nextProgress >= 100 ? "completed" : goal.status,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, goalId));

  revalidatePath("/goals");
}

export default async function GoalsPage() {
  const items = await db.select().from(goals).where(eq(goals.status, "active")).orderBy(desc(goals.createdAt));

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Goals</h1>

      <article className="rounded-lg border border-border bg-bg-surface p-6">
        <h2 className="text-lg font-semibold">New goal</h2>
        <form action={createGoal} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="title"
            placeholder="Run a 10K in 60 days"
            required
            className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="dimension"
            placeholder="Goals & Milestones"
            defaultValue="Goals & Milestones"
            className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            name="description"
            placeholder="Why this goal matters..."
            rows={3}
            className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent md:col-span-2"
          />
          <input
            type="date"
            name="targetDate"
            className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button type="submit" className="rounded-md border border-accent bg-accent-muted px-4 py-2 text-sm md:justify-self-start">
            Create
          </button>
        </form>
      </article>

      {items.length === 0 ? (
        <article className="rounded-lg border border-border bg-bg-surface p-6 text-text-secondary">
          No goals yet. Define what you are moving toward.
        </article>
      ) : (
        <div className="space-y-3">
          {items.map((goal) => (
            <article key={goal.id} className="rounded-lg border border-border bg-bg-surface p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">{goal.title}</h3>
                  <p className="text-sm text-text-secondary">{goal.description || "No description"}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {goal.dimension} · Status: {goal.status} {goal.targetDate ? `· Target: ${goal.targetDate.toISOString().slice(0, 10)}` : ""}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-bg-elevated">
                    <div className="h-full bg-accent" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form action={updateGoalProgress}>
                    <input type="hidden" name="goalId" value={goal.id} />
                    <input type="hidden" name="action" value="plus" />
                    <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm">
                      +10%
                    </button>
                  </form>
                  <form action={updateGoalProgress}>
                    <input type="hidden" name="goalId" value={goal.id} />
                    <input type="hidden" name="action" value="minus" />
                    <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm">
                      -10%
                    </button>
                  </form>
                  <form action={updateGoalProgress}>
                    <input type="hidden" name="goalId" value={goal.id} />
                    <input type="hidden" name="action" value="complete" />
                    <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm">
                      Complete
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

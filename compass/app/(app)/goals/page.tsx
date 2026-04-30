import { desc } from "drizzle-orm";
import { GoalsTable, type GoalRow } from "@/components/goals/goals-table";
import { createGoalAction } from "@/lib/actions/goals";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import { formatDateInput } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const list = await db.select().from(goals).orderBy(desc(goals.createdAt));
  const rows: GoalRow[] = list.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    dimension: g.dimension,
    progress: g.progress ?? 0,
    status: g.status,
    targetDate: formatDateInput(g.targetDate) || null,
  }));

  return (
    <section className="space-y-6">
      <div className="animate-fade-rise">
        <p className="text-sm text-text-secondary">围绕你真正想达成的事</p>
        <h1 className="mt-1 text-4xl tracking-tight" style={{ fontFamily: "var(--font-fraunces)" }}>
          目标
        </h1>
      </div>

      <details className="glass animate-fade-rise-delay p-4 [&[open]>summary]:mb-3">
        <summary className="cursor-pointer list-none text-sm text-text-secondary hover:text-text-primary">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs">+</span>
            手动添加(更建议直接和 Hermes 说"我想完成 XX",它会自动创建)
          </span>
        </summary>
        <form action={createGoalAction} className="flex flex-wrap items-end gap-3">
          <input
            name="title"
            required
            placeholder="新目标标题…"
            className="glass-input flex-1 min-w-[220px] !py-2 text-sm"
          />
          <input
            name="dimension"
            defaultValue="成长"
            placeholder="维度"
            className="glass-input w-32 !py-2 text-sm"
          />
          <input type="date" name="targetDate" className="glass-input w-44 !py-2 text-sm" />
          <button type="submit" className="glass-btn glass-btn-primary !py-2 text-sm">
            保存
          </button>
        </form>
      </details>

      <div className="animate-fade-rise-delay-2">
        <GoalsTable rows={rows} />
      </div>
    </section>
  );
}

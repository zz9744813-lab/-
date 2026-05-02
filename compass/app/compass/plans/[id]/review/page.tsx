import { db } from "@/lib/db/client";
import { plans, planPhases, planTasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { approveAction, rejectAction } from "./actions";

export default async function PlanReviewPage({ params }: { params: { id: string } }) {
  const [plan] = await db.select().from(plans).where(eq(plans.id, params.id));
  if (!plan) return notFound();
  
  if (plan.status !== 'draft') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">计划已处理</h1>
        <p>此计划的状态为：{plan.status}</p>
      </div>
    );
  }

  const phases = await db.select().from(planPhases).where(eq(planPhases.planId, plan.id));
  const phaseIds = phases.map(p => p.id);
  
  let relevantTasks: any[] = [];
  if (phaseIds.length > 0) {
    const tasks = await db.select().from(planTasks);
    relevantTasks = tasks.filter(t => phaseIds.includes(t.phaseId));
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-emerald-400">新计划提案：{plan.title}</h1>
        <p className="text-text-secondary mt-2">{plan.description}</p>
        <p className="text-sm mt-2 text-text-tertiary">{plan.startDate} ~ {plan.endDate}</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold border-b border-border pb-2">阶段与任务</h2>
        {phases.map(phase => (
          <div key={phase.id} className="p-4 border border-border rounded-lg bg-bg-surface">
            <h3 className="font-medium text-lg">{phase.title} <span className="text-sm text-text-tertiary ml-2">({phase.startDate} - {phase.endDate})</span></h3>
            {phase.description && <p className="text-sm text-text-secondary mt-1">{phase.description}</p>}
            <ul className="mt-3 space-y-2 pl-4 list-disc marker:text-emerald-500">
              {relevantTasks.filter(t => t.phaseId === phase.id).map(task => (
                <li key={task.id} className="text-sm">
                  <span className="font-medium text-text-primary">{task.title}</span>
                  {task.estimatedMinutes && <span className="text-text-tertiary ml-2">~{task.estimatedMinutes}分钟</span>}
                  {task.repeatPattern && <span className="ml-2 text-accent">[{task.repeatPattern}]</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-6 border-t border-border items-center">
        <form action={approveAction.bind(null, plan.id)}>
          <button type="submit" className="glass-btn bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 px-6 py-2">
            接受计划
          </button>
        </form>
        <form action={async (formData) => {
          "use server";
          const reason = formData.get("reason") as string;
          await rejectAction(plan.id, reason);
        }} className="flex gap-2 w-full max-w-md">
          <input type="text" name="reason" placeholder="拒绝原因 (可选)" className="px-3 py-2 flex-1 border border-border bg-bg-surface rounded-md text-sm text-text-primary focus:outline-none focus:border-accent" />
          <button type="submit" className="glass-btn px-6 py-2 border-red-500/50 text-red-400 hover:bg-red-500/10">
            拒绝并要求重写
          </button>
        </form>
      </div>
    </div>
  );
}

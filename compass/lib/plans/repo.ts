import { db } from "@/lib/db/client";
import { transact } from "@/lib/db/transaction";
import {
  plans,
  planPhases,
  planTasks,
  planReviewDrafts,
  scheduleItems,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";

function expandTaskDates(
  phase: { startDate: string; endDate: string },
  task: {
    repeatPattern: string | null;
    repeatDays: number | null;
    repeatCount: number | null;
    startOffsetDays: number | null;
    estimatedMinutes: number | null;
    preferredTimeStart: string | null;
    preferredTimeEnd: string | null;
  },
): Array<{ date: string; startTime: string | null; endTime: string | null }> {
  const start = new Date(phase.startDate + "T00:00:00Z");
  const end = new Date(phase.endDate + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() + (task.startOffsetDays ?? 0));

  const startTime = task.preferredTimeStart ?? "20:00";
  const [sh, sm] = startTime.split(":").map(Number);
  const endMinutes = sh * 60 + sm + (task.estimatedMinutes ?? 30);
  const eh = Math.floor(endMinutes / 60) % 24;
  const em = endMinutes % 60;
  const endTime =
    task.preferredTimeEnd ?? `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

  const dates: string[] = [];
  const cursor = new Date(start);
  const max = task.repeatCount ?? 9999;

  while (cursor <= end && dates.length < max) {
    const dow = cursor.getUTCDay(); // 0=Sun ... 6=Sat
    let include = false;

    switch (task.repeatPattern) {
      case "once":
        include = dates.length === 0;
        break;
      case "daily":
        include = true;
        break;
      case "weekdays":
        include = dow >= 1 && dow <= 5;
        break;
      case "weekly": {
        const startDow = start.getUTCDay();
        include = dow === startDow;
        break;
      }
      case "every_n_days": {
        const days = task.repeatDays ?? 2;
        const diffDays = Math.round(
          (cursor.getTime() - start.getTime()) / (24 * 3600 * 1000),
        );
        include = diffDays % days === 0;
        break;
      }
      default:
        include = false;
    }

    if (include) {
      dates.push(cursor.toISOString().slice(0, 10));
      if (task.repeatPattern === "once") break;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates.map((d) => ({ date: d, startTime, endTime }));
}

export async function createPlan(data: {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  targetVolume?: string;
  sourceAttachmentSha?: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(plans).values({
    id,
    ...data,
    status: 'draft'
  });
  return id;
}

export async function createPlanPhase(data: {
  planId: string;
  title: string;
  startDate: string;
  endDate: string;
  isMilestone?: boolean;
  milestoneTitle?: string;
  description?: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(planPhases).values({
    id,
    ...data,
    status: 'pending',
    isMilestone: data.isMilestone ? 1 : 0
  });
  return id;
}

export async function createPlanTask(data: {
  phaseId: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  difficulty?: string;
  repeatPattern?: string;
  repeatDays?: number;
  repeatCount?: number;
  startOffsetDays?: number;
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(planTasks).values({
    id,
    ...data
  });
  return id;
}

export async function approvePlanDraft(planId: string): Promise<{
  ok: true;
  scheduleItemsCreated: number;
  phasesProcessed: number;
}> {
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan) throw new Error(`Plan ${planId} not found`);
  if (plan.status !== "draft") {
    throw new Error(`Plan ${planId} is not in draft state (current: ${plan.status})`);
  }

  const phases = await db.select().from(planPhases).where(eq(planPhases.planId, planId));
  if (phases.length === 0) {
    throw new Error(`Plan ${planId} has no phases — cannot approve empty plan`);
  }

  const inserts: Array<typeof scheduleItems.$inferInsert> = [];
  for (const phase of phases) {
    const tasks = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.phaseId, phase.id));

    for (const task of tasks) {
      const occurrences = expandTaskDates(phase, {
        repeatPattern: task.repeatPattern,
        repeatDays: task.repeatDays,
        repeatCount: task.repeatCount,
        startOffsetDays: task.startOffsetDays,
        estimatedMinutes: task.estimatedMinutes,
        preferredTimeStart: task.preferredTimeStart,
        preferredTimeEnd: task.preferredTimeEnd,
      });

      for (const occ of occurrences) {
        inserts.push({
          id: crypto.randomUUID(),
          title: task.title,
          description: task.description ?? undefined,
          date: occ.date,
          startTime: occ.startTime,
          endTime: occ.endTime,
          priority: task.difficulty === "high" ? "high" : task.difficulty === "low" ? "low" : "medium",
          status: "planned",
          source: "plan",
          planId: plan.id,
          planPhaseId: phase.id,
          planTaskId: task.id,
          expectedMinutes: task.estimatedMinutes,
        });
      }
    }
  }

  transact(() => {});

  await db.update(plans).set({ status: "active", updatedAt: new Date() }).where(eq(plans.id, plan.id));
  for (const phase of phases) {
    await db
      .update(planPhases)
      .set({ status: "active", approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(planPhases.id, phase.id));
  }
  if (inserts.length > 0) {
    for (let i = 0; i < inserts.length; i += 100) {
      await db.insert(scheduleItems).values(inserts.slice(i, i + 100));
    }
  }

  return { ok: true, scheduleItemsCreated: inserts.length, phasesProcessed: phases.length };
}

export async function rejectPlanDraft(planId: string, _reason: string): Promise<void> {
  const drafts = await db.select().from(planReviewDrafts).where(
    and(eq(planReviewDrafts.planId, planId), eq(planReviewDrafts.status, "pending")),
  );
  for (const d of drafts) {
    await db
      .update(planReviewDrafts)
      .set({ status: "rejected" })
      .where(eq(planReviewDrafts.id, d.id));
  }
}

export async function createReviewDraft(data: {
  planId: string;
  phaseDraftJson: string;
  generatedByRunId?: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(planReviewDrafts).values({
    id,
    planId: data.planId,
    phaseDraftJson: data.phaseDraftJson,
    generatedByRunId: data.generatedByRunId,
    status: "pending",
  });
  return id;
}

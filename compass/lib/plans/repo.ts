import { db } from "@/lib/db/client";
import { plans, planPhases, planTasks, planReviewDrafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

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

export async function createReviewDraft(data: {
  planId: string;
  brainRunId?: string;
  aiRationale: string;
  proposedTasksJson: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(planReviewDrafts).values({
    id,
    ...data,
    status: 'pending'
  });
  return id;
}

export async function approvePlanDraft(planId: string) {
  await db.update(plans).set({ status: 'active' }).where(eq(plans.id, planId));
}

export async function rejectPlanDraft(planId: string, reason: string) {
  await db.update(plans).set({ status: 'rejected' }).where(eq(plans.id, planId));
}

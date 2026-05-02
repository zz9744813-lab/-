"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { goals, goalEvents } from "@/lib/db/schema";

const EDITABLE_FIELDS = new Set(["title", "description", "dimension", "targetDate"]);

// ── Event logging ─────────────────────────────────────────

async function logGoalEvent(
  goalId: string,
  type: string,
  opts?: { fromStatus?: string; toStatus?: string; note?: string; reason?: string; payload?: unknown },
) {
  await db.insert(goalEvents).values({
    goalId,
    type,
    fromStatus: opts?.fromStatus ?? null,
    toStatus: opts?.toStatus ?? null,
    note: opts?.note ?? null,
    reason: opts?.reason ?? null,
    payloadJson: opts?.payload ? JSON.stringify(opts.payload) : null,
  });
}

// ── Status actions ────────────────────────────────────────

export async function pauseGoal(id: string, reason?: string) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!goal || goal.status !== "active") return;

  await db.update(goals).set({ status: "paused", updatedAt: new Date() }).where(eq(goals.id, id));
  await logGoalEvent(id, "paused", { fromStatus: "active", toStatus: "paused", reason });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function resumeGoal(id: string) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!goal || goal.status !== "paused") return;

  await db.update(goals).set({ status: "active", updatedAt: new Date() }).where(eq(goals.id, id));
  await logGoalEvent(id, "resumed", { fromStatus: "paused", toStatus: "active" });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function completeGoal(id: string, payload: { finalNote: string; finalScore?: number }) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!goal || goal.status === "completed") return;

  const fromStatus = goal.status;
  await db
    .update(goals)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(goals.id, id));

  await logGoalEvent(id, "completed", {
    fromStatus,
    toStatus: "completed",
    note: payload.finalNote,
    payload: { finalScore: payload.finalScore },
  });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function reopenGoal(id: string, reason?: string) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!goal || goal.status === "active") return;

  const fromStatus = goal.status;
  await db.update(goals).set({ status: "active", updatedAt: new Date() }).where(eq(goals.id, id));
  await logGoalEvent(id, "reopened", { fromStatus, toStatus: "active", reason });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function archiveGoal(id: string) {
  const [goal] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!goal) return;

  const fromStatus = goal.status;
  await db.update(goals).set({ status: "archived", updatedAt: new Date() }).where(eq(goals.id, id));
  await logGoalEvent(id, "archived", { fromStatus, toStatus: "archived" });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

// ── Field updates (title/description/dimension/targetDate only) ──

export async function updateGoalField(id: string, field: string, value: string) {
  if (!id || !EDITABLE_FIELDS.has(field)) return;

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (field === "targetDate") {
    patch.targetDate = value ? new Date(value) : null;
  } else if (field === "title") {
    if (!value.trim()) return;
    patch.title = value.trim();
  } else if (field === "dimension") {
    patch.dimension = value.trim() || "成长";
  } else {
    patch[field] = value || null;
  }

  await db.update(goals).set(patch).where(eq(goals.id, id));
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoal(id: string) {
  if (!id) return;
  await db.delete(goals).where(eq(goals.id, id));
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function createGoalAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const description = String(formData.get("description") ?? "").trim();
  const dimension = String(formData.get("dimension") ?? "成长").trim() || "成长";
  const targetDateRaw = String(formData.get("targetDate") ?? "").trim();

  const [created] = await db
    .insert(goals)
    .values({
      title,
      description: description || null,
      dimension,
      targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
      status: "active",
      progress: 0,
    })
    .returning();

  if (created) {
    await logGoalEvent(created.id, "created", { toStatus: "active", note: "手动创建" });
  }
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

// ── Queries ───────────────────────────────────────────────

export async function getGoalEvents(goalId: string) {
  return db
    .select()
    .from(goalEvents)
    .where(eq(goalEvents.goalId, goalId))
    .orderBy(desc(goalEvents.createdAt));
}

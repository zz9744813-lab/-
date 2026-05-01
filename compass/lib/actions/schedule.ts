"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { scheduleItems, scheduleEvents } from "@/lib/db/schema";

const STATUSES = new Set(["planned", "in_progress", "done", "delayed", "skipped", "cancelled"]);
const PRIORITIES = new Set(["low", "medium", "high"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Event logging ─────────────────────────────────────────

async function logEvent(
  scheduleItemId: string,
  type: string,
  opts?: { fromStatus?: string; toStatus?: string; note?: string; reason?: string; payload?: unknown },
) {
  await db.insert(scheduleEvents).values({
    scheduleItemId,
    type,
    fromStatus: opts?.fromStatus ?? null,
    toStatus: opts?.toStatus ?? null,
    note: opts?.note ?? null,
    reason: opts?.reason ?? null,
    payloadJson: opts?.payload ? JSON.stringify(opts.payload) : null,
  });
}

// ── Status transition actions ─────────────────────────────

export async function startScheduleItem(id: string) {
  const [item] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
  if (!item || item.status !== "planned") return;

  await db
    .update(scheduleItems)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(scheduleItems.id, id));

  await logEvent(id, "started", { fromStatus: "planned", toStatus: "in_progress" });
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export async function completeScheduleItem(
  id: string,
  payload: {
    completionNote: string;
    reviewScore: number;
    partial?: boolean;
    quickComplete?: boolean;
  },
) {
  const [item] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
  if (!item || item.status === "done" || item.status === "cancelled") return;

  const fromStatus = item.status;
  const note = payload.quickComplete ? "快速完成，未填写详细反馈" : payload.completionNote;

  await db
    .update(scheduleItems)
    .set({
      status: "done",
      completedAt: new Date(),
      completionNote: note,
      reviewScore: Math.min(100, Math.max(0, Math.round(payload.reviewScore))),
      quickComplete: payload.quickComplete ?? false,
      updatedAt: new Date(),
    })
    .where(eq(scheduleItems.id, id));

  await logEvent(id, "completed", {
    fromStatus,
    toStatus: "done",
    note,
    payload: { reviewScore: payload.reviewScore, partial: payload.partial, quickComplete: payload.quickComplete },
  });
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export async function delayScheduleItem(
  id: string,
  payload: {
    newDate: string;
    newStartTime?: string;
    reason: string;
    note?: string;
  },
) {
  if (!DATE_RE.test(payload.newDate)) return;
  const [item] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
  if (!item || item.status === "done" || item.status === "cancelled") return;

  const fromStatus = item.status;
  await db
    .update(scheduleItems)
    .set({
      status: "delayed",
      date: payload.newDate,
      startTime: payload.newStartTime && TIME_RE.test(payload.newStartTime) ? payload.newStartTime : item.startTime,
      delayReason: payload.reason,
      updatedAt: new Date(),
    })
    .where(eq(scheduleItems.id, id));

  await logEvent(id, "delayed", {
    fromStatus,
    toStatus: "delayed",
    reason: payload.reason,
    note: payload.note,
    payload: { newDate: payload.newDate, newStartTime: payload.newStartTime },
  });
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export async function skipScheduleItem(
  id: string,
  payload: { reason: string; note?: string },
) {
  const [item] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
  if (!item || item.status === "done" || item.status === "cancelled") return;

  const fromStatus = item.status;
  await db
    .update(scheduleItems)
    .set({ status: "skipped", skipReason: payload.reason, updatedAt: new Date() })
    .where(eq(scheduleItems.id, id));

  await logEvent(id, "skipped", { fromStatus, toStatus: "skipped", reason: payload.reason, note: payload.note });
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export async function cancelScheduleItem(
  id: string,
  payload: { reason: string; note?: string },
) {
  const [item] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
  if (!item || item.status === "cancelled") return;

  const fromStatus = item.status;
  await db
    .update(scheduleItems)
    .set({ status: "cancelled", cancelReason: payload.reason, updatedAt: new Date() })
    .where(eq(scheduleItems.id, id));

  await logEvent(id, "cancelled", { fromStatus, toStatus: "cancelled", reason: payload.reason, note: payload.note });
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export async function reopenScheduleItem(id: string, payload: { reason: string }) {
  const [item] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
  if (!item || item.status === "planned" || item.status === "in_progress") return;

  const fromStatus = item.status;
  await db
    .update(scheduleItems)
    .set({ status: "planned", completedAt: null, updatedAt: new Date() })
    .where(eq(scheduleItems.id, id));

  await logEvent(id, "reopened", { fromStatus, toStatus: "planned", reason: payload.reason });
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

// ── Legacy field updates (for non-status fields only) ─────

const EDITABLE_FIELDS = new Set(["title", "description", "date", "startTime", "endTime", "priority", "reminderEmail", "reminderMinutes"]);

export async function updateScheduleField(id: string, field: string, value: string) {
  if (!id || !EDITABLE_FIELDS.has(field)) return;
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (field === "title") {
    if (!value.trim()) return;
    patch.title = value.trim();
  } else if (field === "description") {
    patch.description = value.trim() || null;
  } else if (field === "date") {
    if (!DATE_RE.test(value)) return;
    patch.date = value;
  } else if (field === "startTime" || field === "endTime") {
    if (value && !TIME_RE.test(value)) return;
    patch[field] = value || null;
  } else if (field === "priority") {
    if (!PRIORITIES.has(value)) return;
    patch.priority = value;
  } else if (field === "reminderEmail") {
    const email = value.trim();
    if (email && !EMAIL_RE.test(email)) return;
    patch.reminderEmail = email || null;
    patch.reminderSentAt = null;
  } else if (field === "reminderMinutes") {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return;
    patch.reminderMinutes = Math.min(1440, Math.max(0, Math.round(minutes)));
    patch.reminderSentAt = null;
  }

  const [old] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
  await db.update(scheduleItems).set(patch).where(eq(scheduleItems.id, id));
  if (old) {
    await logEvent(id, "edited", { note: `${field} changed` });
  }
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export async function deleteScheduleItem(id: string) {
  if (!id) return;
  await db.delete(scheduleItems).where(eq(scheduleItems.id, id));
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

export async function createScheduleAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const date = String(formData.get("date") ?? "").trim();
  if (!DATE_RE.test(date)) return;

  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium");
  const description = String(formData.get("description") ?? "").trim();
  const reminderEmail = String(formData.get("reminderEmail") ?? "").trim();
  const reminderMinutesRaw = Number(formData.get("reminderMinutes") ?? 15);
  const reminderMinutes = Number.isFinite(reminderMinutesRaw)
    ? Math.min(1440, Math.max(0, Math.round(reminderMinutesRaw)))
    : 15;

  const [created] = await db
    .insert(scheduleItems)
    .values({
      title,
      description: description || null,
      date,
      startTime: TIME_RE.test(startTime) ? startTime : null,
      endTime: TIME_RE.test(endTime) ? endTime : null,
      priority: PRIORITIES.has(priority) ? priority : "medium",
      reminderEmail: EMAIL_RE.test(reminderEmail) ? reminderEmail : null,
      reminderMinutes,
      source: "user",
    })
    .returning();

  if (created) {
    await logEvent(created.id, "created", { toStatus: "planned", note: "手动创建" });
  }
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

// ── Queries ───────────────────────────────────────────────

export async function getScheduleEvents(scheduleItemId: string) {
  return db
    .select()
    .from(scheduleEvents)
    .where(eq(scheduleEvents.scheduleItemId, scheduleItemId))
    .orderBy(desc(scheduleEvents.createdAt));
}

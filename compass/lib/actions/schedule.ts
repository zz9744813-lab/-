"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { scheduleItems } from "@/lib/db/schema";

const STRING_FIELDS = new Set([
  "title",
  "description",
  "date",
  "startTime",
  "endTime",
  "priority",
  "status",
  "reminderEmail",
  "reminderMinutes",
  "completionNote",
  "reviewScore",
]);
const PRIORITIES = new Set(["low", "medium", "high"]);
const STATUSES = new Set(["planned", "done", "cancelled"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateScheduleField(id: string, field: string, value: string) {
  if (!id || !STRING_FIELDS.has(field)) return;
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
  } else if (field === "status") {
    if (!STATUSES.has(value)) return;
    patch.status = value;
    if (value === "done") patch.completedAt = new Date();
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
  } else if (field === "completionNote") {
    patch.completionNote = value.trim() || null;
  } else if (field === "reviewScore") {
    if (!value.trim()) {
      patch.reviewScore = null;
      patch.reviewJson = null;
    } else {
      const score = Number(value);
      if (!Number.isFinite(score)) return;
      patch.reviewScore = Math.min(100, Math.max(0, score));
    }
  }

  await db.update(scheduleItems).set(patch).where(eq(scheduleItems.id, id));
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

  await db.insert(scheduleItems).values({
    title,
    description: description || null,
    date,
    startTime: TIME_RE.test(startTime) ? startTime : null,
    endTime: TIME_RE.test(endTime) ? endTime : null,
    priority: PRIORITIES.has(priority) ? priority : "medium",
    reminderEmail: EMAIL_RE.test(reminderEmail) ? reminderEmail : null,
    reminderMinutes,
    source: "user",
  });
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
}

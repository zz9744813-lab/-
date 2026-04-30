"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";

const STRING_FIELDS = new Set(["title", "description", "dimension", "status"]);
const STATUS_VALUES = new Set(["active", "completed", "paused"]);

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

export async function updateGoalField(id: string, field: string, value: string) {
  if (!id) return;
  if (field === "status") {
    if (!STATUS_VALUES.has(value)) return;
    await db.update(goals).set({ status: value, updatedAt: new Date() }).where(eq(goals.id, id));
  } else if (field === "targetDate") {
    await db
      .update(goals)
      .set({ targetDate: value ? new Date(value) : null, updatedAt: new Date() })
      .where(eq(goals.id, id));
  } else if (STRING_FIELDS.has(field)) {
    const patch: Record<string, unknown> = { [field]: value || null, updatedAt: new Date() };
    if (field === "title" && !value.trim()) return;
    if (field === "title") patch.title = value.trim();
    if (field === "dimension") patch.dimension = value.trim() || "成长";
    await db.update(goals).set(patch).where(eq(goals.id, id));
  } else {
    return;
  }
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function adjustGoalProgress(id: string, delta: number) {
  if (!id) return;
  const current = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!current[0]) return;
  const next = clamp((current[0].progress ?? 0) + delta);
  await db
    .update(goals)
    .set({
      progress: next,
      status: next >= 100 ? "completed" : current[0].status === "completed" ? "active" : current[0].status,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, id));
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
  await db.insert(goals).values({
    title,
    description: description || null,
    dimension,
    targetDate: targetDateRaw ? new Date(targetDateRaw) : null,
    status: "active",
    progress: 0,
  });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

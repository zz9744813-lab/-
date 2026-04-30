"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";

const STRING_FIELDS = new Set(["name", "frequency", "status"]);
const STATUS_VALUES = new Set(["active", "paused", "archived"]);

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function updateHabitField(id: string, field: string, value: string) {
  if (!id) return;
  if (!STRING_FIELDS.has(field)) return;
  if (field === "status" && !STATUS_VALUES.has(value)) return;
  if (field === "name" && !value.trim()) return;
  const patch: Record<string, unknown> = { [field]: value };
  if (field === "name") patch.name = value.trim();
  if (field === "frequency") patch.frequency = value.trim() || "每日";
  await db.update(habits).set(patch).where(eq(habits.id, id));
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function toggleHabitToday(id: string) {
  if (!id) return;
  const date = today();
  const exists = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, id), eq(habitLogs.date, date)))
    .limit(1);
  if (exists.length) {
    await db.delete(habitLogs).where(eq(habitLogs.id, exists[0].id));
  } else {
    await db.insert(habitLogs).values({ habitId: id, date, completed: true });
  }
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function deleteHabit(id: string) {
  if (!id) return;
  await db.delete(habitLogs).where(eq(habitLogs.habitId, id));
  await db.delete(habits).where(eq(habits.id, id));
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function createHabitAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const frequency = String(formData.get("frequency") ?? "每日").trim() || "每日";
  await db.insert(habits).values({ name, frequency, status: "active" });
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

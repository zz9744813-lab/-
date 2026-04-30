"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";

const STRING_FIELDS = new Set(["title", "content", "date", "tags"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function updateJournalField(id: string, field: string, value: string) {
  if (!id || !STRING_FIELDS.has(field)) return;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (field === "date") {
    if (!DATE_RE.test(value)) return;
    patch.date = value;
  } else if (field === "title" || field === "content") {
    patch[field] = value;
  } else {
    patch[field] = value.trim() || null;
  }
  await db.update(journalEntries).set(patch).where(eq(journalEntries.id, id));
  revalidatePath("/journal");
}

export async function updateJournalMood(id: string, mood: number | null) {
  if (!id) return;
  await db.update(journalEntries).set({ mood, updatedAt: new Date() }).where(eq(journalEntries.id, id));
  revalidatePath("/journal");
}

export async function deleteJournalEntry(id: string) {
  if (!id) return;
  await db.delete(journalEntries).where(eq(journalEntries.id, id));
  revalidatePath("/journal");
}

export async function createJournalAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  await db.insert(journalEntries).values({
    title: title || null,
    content,
    date,
  });
  revalidatePath("/journal");
}

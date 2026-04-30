"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { financeTransactions } from "@/lib/db/schema";

const TYPES = new Set(["income", "expense"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STRING_FIELDS = new Set(["type", "category", "note", "date"]);

export async function updateFinanceField(id: string, field: string, value: string) {
  if (!id || !STRING_FIELDS.has(field)) return;
  const patch: Record<string, unknown> = {};
  if (field === "type") {
    if (!TYPES.has(value)) return;
    patch.type = value;
  } else if (field === "date") {
    if (!DATE_RE.test(value)) return;
    patch.date = value;
  } else {
    patch[field] = value.trim() || null;
  }
  await db.update(financeTransactions).set(patch).where(eq(financeTransactions.id, id));
  revalidatePath("/finance");
}

export async function updateFinanceAmount(id: string, value: string) {
  if (!id) return;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return;
  await db.update(financeTransactions).set({ amount }).where(eq(financeTransactions.id, id));
  revalidatePath("/finance");
}

export async function deleteTransaction(id: string) {
  if (!id) return;
  await db.delete(financeTransactions).where(eq(financeTransactions.id, id));
  revalidatePath("/finance");
}

export async function createTransactionAction(formData: FormData) {
  const type = String(formData.get("type") ?? "expense").trim();
  if (!TYPES.has(type)) return;
  const amount = Number(formData.get("amount") ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const category = String(formData.get("category") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  await db.insert(financeTransactions).values({
    type,
    amount,
    category: category || null,
    note: note || null,
    date,
  });
  revalidatePath("/finance");
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";

const STRING_FIELDS = new Set(["rawText", "dimension", "status"]);
const STATUSES = new Set(["inbox", "processed"]);

export async function updateCaptureField(id: string, field: string, value: string) {
  if (!id || !STRING_FIELDS.has(field)) return;
  const patch: Record<string, unknown> = {};
  if (field === "status") {
    if (!STATUSES.has(value)) return;
    patch.status = value;
  } else if (field === "rawText") {
    if (!value.trim()) return;
    patch.rawText = value.trim();
  } else {
    patch[field] = value.trim() || null;
  }
  await db.update(captures).set(patch).where(eq(captures.id, id));
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

export async function deleteCapture(id: string) {
  if (!id) return;
  await db.delete(captures).where(eq(captures.id, id));
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

export async function createCaptureAction(formData: FormData) {
  const rawText = String(formData.get("rawText") ?? "").trim();
  if (!rawText) return;
  const dimension = String(formData.get("dimension") ?? "").trim();
  await db.insert(captures).values({
    rawText,
    dimension: dimension || null,
    source: "web",
    status: "inbox",
  });
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
}

"use server";
import { approvePlanDraft, rejectPlanDraft } from "@/lib/plans/repo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function approveAction(planId: string) {
  await approvePlanDraft(planId);
  revalidatePath(`/compass/plans/${planId}`);
  redirect(`/compass/plans/${planId}`);
}

export async function rejectAction(planId: string, reason: string) {
  await rejectPlanDraft(planId, reason);
  revalidatePath(`/compass`);
  redirect(`/compass`);
}

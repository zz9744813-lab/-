"use server";
import { approvePlanDraft, rejectPlanDraft } from "@/lib/plans/repo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function approveAction(planId: string) {
  const result = await approvePlanDraft(planId);
  console.log(`[approveAction] Plan ${planId} approved: ${result.scheduleItemsCreated} schedule_items created across ${result.phasesProcessed} phases`);
  revalidatePath(`/compass/plans/${planId}`);
  redirect(`/schedule`);
}

export async function rejectAction(planId: string, reason: string) {
  await rejectPlanDraft(planId, reason);
  revalidatePath(`/compass`);
  redirect(`/compass`);
}

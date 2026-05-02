import { createPlan, createPlanPhase, createPlanTask } from "@/lib/plans/repo";
import type { McpTool } from "./types";

export const proposePlanTool: McpTool = {
  name: "compass.propose_plan",
  description: "Propose a new long-term plan draft.",
  async execute(params) {
    const id = await createPlan({
      title: String(params.title),
      description: params.description ? String(params.description) : undefined,
      startDate: String(params.startDate),
      endDate: String(params.endDate),
      targetVolume: params.targetVolume ? String(params.targetVolume) : undefined,
      sourceAttachmentSha: params.sourceAttachmentSha ? String(params.sourceAttachmentSha) : undefined,
    });
    return { ok: true, id };
  }
};

export const proposePhaseTool: McpTool = {
  name: "compass.propose_phase",
  description: "Propose a phase for an existing plan draft.",
  async execute(params) {
    const id = await createPlanPhase({
      planId: String(params.planId),
      orderIndex: typeof params.orderIndex === "number" ? params.orderIndex : 0,
      title: String(params.title),
      startDate: String(params.startDate),
      endDate: String(params.endDate),
      isMilestone: Boolean(params.isMilestone),
      milestoneTitle: params.milestoneTitle ? String(params.milestoneTitle) : undefined,
      description: params.description ? String(params.description) : undefined,
    });
    return { ok: true, id };
  }
};

export const proposePlanTasksTool: McpTool = {
  name: "compass.propose_plan_tasks",
  description: "Propose tasks for a specific plan phase.",
  async execute(params) {
    const tasks = params.tasks as any[];
    const ids = [];
    for (const t of tasks) {
      const id = await createPlanTask({
        phaseId: String(params.phaseId),
        title: String(t.title),
        description: t.description ? String(t.description) : undefined,
        estimatedMinutes: t.estimatedMinutes ? Number(t.estimatedMinutes) : undefined,
        difficulty: t.difficulty ? String(t.difficulty) : undefined,
        repeatPattern: t.repeatPattern ? String(t.repeatPattern) : undefined,
        repeatDays: t.repeatDays ? Number(t.repeatDays) : undefined,
        repeatCount: t.repeatCount ? Number(t.repeatCount) : undefined,
        startOffsetDays: t.startOffsetDays ? Number(t.startOffsetDays) : undefined,
        preferredTimeStart: t.preferredTimeStart ? String(t.preferredTimeStart) : undefined,
        preferredTimeEnd: t.preferredTimeEnd ? String(t.preferredTimeEnd) : undefined,
      });
      ids.push(id);
    }
    return { ok: true, ids };
  }
};

import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm");

export const ActionSchemas = {
  create_schedule_item: z.object({
    title: z.string().min(1),
    date: dateStr,
    startTime: timeStr.optional(),
    endTime: timeStr.optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    description: z.string().optional(),
    evidence: z.string().optional(),
  }),
  update_schedule_item: z.object({
    id: z.string(),
    title: z.string().optional(),
    date: dateStr.optional(),
    startTime: timeStr.optional(),
    endTime: timeStr.optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    description: z.string().optional(),
  }),
  cancel_schedule_item: z.object({
    id: z.string(),
    reason: z.string().optional(),
  }),
  create_goal: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    targetDate: dateStr.optional(),
  }),
  update_goal: z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    progress: z.number().int().min(0).max(100).optional(),
    status: z.enum(["active", "completed", "abandoned"]).optional(),
  }),
  create_journal_entry: z.object({
    title: z.string().optional(),
    date: dateStr,
    content: z.string().min(1),
    mood: z.number().int().min(1).max(5).optional(),
    tags: z.string().optional(),
  }),
  update_journal_entry: z.object({
    id: z.string(),
    title: z.string().optional(),
    content: z.string().optional(),
    mood: z.number().int().min(1).max(5).optional(),
  }),
  create_finance_transaction: z.object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.number(),
    date: dateStr,
    category: z.string().optional(),
    note: z.string().optional(),
  }),
  create_capture: z.object({
    rawText: z.string().min(1),
  }),
  save_review: z.object({
    period: z.enum(["week", "month", "year"]),
    title: z.string().min(1),
    body: z.string().min(1),
    startDate: dateStr.optional(),
    endDate: dateStr.optional(),
  }),
  propose_plan: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    startDate: dateStr,
    endDate: dateStr,
    targetVolume: z.string().optional(),
    sourceAttachmentSha: z.string().optional(),
    feasibilityNotes: z.string().optional(),
  }),
  propose_phase: z.object({
    planId: z.string(),
    orderIndex: z.number().int().min(0),
    title: z.string().min(1),
    startDate: dateStr,
    endDate: dateStr,
    isMilestone: z.boolean().default(false),
    milestoneTitle: z.string().optional(),
    description: z.string().optional(),
  }),
  propose_plan_tasks: z.object({
    phaseId: z.string(),
    tasks: z.array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        estimatedMinutes: z.number().int().min(1).default(60),
        difficulty: z.enum(["low", "medium", "high"]).default("medium"),
        repeatPattern: z.enum(["once", "daily", "weekdays", "weekly", "every_n_days"]).default("once"),
        repeatDays: z.number().int().optional(),
        repeatCount: z.number().int().optional(),
        startOffsetDays: z.number().int().default(0),
        preferredTimeStart: timeStr.optional(),
        preferredTimeEnd: timeStr.optional(),
      })
    ).min(1),
  }),
  save_insight: z.object({
    category: z.string(),
    title: z.string().min(1),
    body: z.string().min(1),
    confidence: z.number().min(0).max(1).optional(),
  }),
};

export function validateAction(type: string, payload: unknown): 
  | { ok: true; data: unknown }
  | { ok: false; missing: string[]; errors: string[] } {
  
  const schema = (ActionSchemas as any)[type];
  if (!schema) {
    return { ok: false, missing: [], errors: [`Unknown action type: ${type}`] };
  }

  const result = schema.safeParse(payload);
  if (result.success) {
    return { ok: true, data: result.data };
  } else {
    const missing: string[] = [];
    const errors: string[] = [];
    
    for (const err of result.error.errors) {
      if (err.code === "invalid_type" && err.received === "undefined") {
        missing.push(err.path.join("."));
      }
      errors.push(`${err.path.join(".")}: ${err.message}`);
    }
    
    return { ok: false, missing, errors };
  }
}

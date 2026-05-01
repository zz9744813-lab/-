import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reviewMemories, scheduleItems } from "@/lib/db/schema";
import { completeScheduleItem } from "@/lib/actions/schedule";
import type { McpTool } from "@/lib/mcp/tools/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const PRIORITIES = new Set(["low", "medium", "high"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function stringifyOptionalJson(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export const updateScheduleItemTool: McpTool = {
  name: "compass.update_schedule_item",
  description: "Update a schedule item's fields. Only provided fields are changed. Status changes go through proper actions with event logging.",
  async execute(params) {
    const id = String(params.id ?? "").trim();
    if (!id) throw new Error("id is required");

    const [existing] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
    if (!existing) throw new Error("schedule item not found");

    // Handle status transitions through proper actions
    if (params.status !== undefined) {
      const newStatus = String(params.status).trim();
      if (newStatus === "done") {
        await completeScheduleItem(id, {
          completionNote: String(params.completionNote ?? `完成了任务：${existing.title}`),
          reviewScore: Number(params.reviewScore ?? 75),
          quickComplete: false,
        });

        // Create review memory
        const title = existing.title;
        const summary = String(params.completionNote ?? `完成了任务：${title}`);
        await db.insert(reviewMemories).values({
          period: "task",
          startDate: existing.date,
          endDate: existing.date,
          title: `任务完成复盘：${title}`,
          summary,
          metricsJson: JSON.stringify({
            scheduleItemId: id,
            status: "done",
            score: params.reviewScore ?? 75,
            date: existing.date,
          }),
          dimensionsJson: stringifyOptionalJson(params.reviewJson),
          source: "hermes",
          sourceId: id,
        });

        return { ok: true, updated: 1, action: "completed" };
      }
      // For other status changes, just update fields (not status) via direct DB
      // Status changes should go through the proper action functions
    }

    // Non-status field updates
    const patch: Record<string, unknown> = {};

    if (params.title !== undefined) {
      const title = String(params.title).trim();
      if (!title) throw new Error("title cannot be empty");
      patch.title = title;
    }
    if (params.description !== undefined) {
      const text = String(params.description).trim();
      patch.description = text === "" ? null : text;
    }
    if (params.date !== undefined) {
      const date = String(params.date).trim();
      if (!DATE_PATTERN.test(date)) throw new Error("date must be YYYY-MM-DD");
      patch.date = date;
    }
    for (const field of ["startTime", "endTime"] as const) {
      if (params[field] !== undefined) {
        const text = String(params[field]).trim();
        if (text !== "" && !TIME_PATTERN.test(text)) {
          throw new Error(`${field} must be HH:mm`);
        }
        patch[field] = text === "" ? null : text;
      }
    }
    if (params.priority !== undefined) {
      const value = String(params.priority).trim();
      if (!PRIORITIES.has(value)) throw new Error("priority must be low/medium/high");
      patch.priority = value;
    }
    if (params.reminderEmail !== undefined) {
      const email = optionalString(params.reminderEmail);
      if (email && !EMAIL_PATTERN.test(email)) throw new Error("reminderEmail must be a valid email address");
      patch.reminderEmail = email;
      patch.reminderSentAt = null;
    }
    if (params.reminderMinutes !== undefined) {
      const minutes = Number(params.reminderMinutes);
      if (!Number.isFinite(minutes)) throw new Error("reminderMinutes must be a number");
      patch.reminderMinutes = Math.min(1440, Math.max(0, Math.round(minutes)));
      patch.reminderSentAt = null;
    }
    if (params.completionNote !== undefined) {
      patch.completionNote = optionalString(params.completionNote);
    }
    if (params.reviewScore !== undefined) {
      const score = Number(params.reviewScore);
      if (!Number.isFinite(score)) throw new Error("reviewScore must be a number");
      patch.reviewScore = Math.min(100, Math.max(0, score));
    }
    if (params.reviewJson !== undefined) {
      patch.reviewJson = stringifyOptionalJson(params.reviewJson);
    }

    if (Object.keys(patch).length === 0) {
      return { ok: true, updated: 0 };
    }
    patch.updatedAt = new Date();

    const result = await db.update(scheduleItems).set(patch).where(eq(scheduleItems.id, id));
    return { ok: true, updated: result.changes ?? 0 };
  },
};

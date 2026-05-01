import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reviewMemories, scheduleItems } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const PRIORITIES = new Set(["low", "medium", "high"]);
const STATUSES = new Set(["planned", "done", "cancelled"]);
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
  description: "Update a schedule item's fields. Only provided fields are changed.",
  async execute(params) {
    const id = String(params.id ?? "").trim();
    if (!id) throw new Error("id is required");

    const [existing] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id)).limit(1);
    if (!existing) throw new Error("schedule item not found");

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
    if (params.status !== undefined) {
      const value = String(params.status).trim();
      if (!STATUSES.has(value)) throw new Error("status must be planned/done/cancelled");
      patch.status = value;
      if (value === "done" && !existing.completedAt) {
        patch.completedAt = new Date();
      }
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
    if (
      (patch.status === "done" || params.completionNote !== undefined || params.reviewScore !== undefined || params.reviewJson !== undefined) &&
      (patch.completionNote || patch.reviewScore !== undefined || patch.reviewJson)
    ) {
      const title = String(patch.title ?? existing.title);
      const summary = String(patch.completionNote ?? existing.completionNote ?? `完成了任务：${title}`);
      await db.insert(reviewMemories).values({
        period: "task",
        startDate: existing.date,
        endDate: existing.date,
        title: `任务完成复盘：${title}`,
        summary,
        metricsJson: JSON.stringify({
          scheduleItemId: id,
          status: "done",
          score: patch.reviewScore ?? existing.reviewScore ?? null,
          date: existing.date,
        }),
        dimensionsJson: stringifyOptionalJson(params.reviewJson),
        source: "hermes",
        sourceId: id,
      });
    }

    return { ok: true, updated: result.changes ?? 0 };
  },
};

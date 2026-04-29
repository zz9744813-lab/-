import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scheduleItems } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const PRIORITIES = new Set(["low", "medium", "high"]);
const STATUSES = new Set(["planned", "done", "cancelled"]);

export const updateScheduleItemTool: McpTool = {
  name: "compass.update_schedule_item",
  description: "Update a schedule item's fields. Only provided fields are changed.",
  async execute(params) {
    const id = String(params.id ?? "").trim();
    if (!id) throw new Error("id is required");

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
    }

    if (Object.keys(patch).length === 0) {
      return { ok: true, updated: 0 };
    }
    patch.updatedAt = new Date();

    const result = await db.update(scheduleItems).set(patch).where(eq(scheduleItems.id, id));
    return { ok: true, updated: result.changes ?? 0 };
  },
};

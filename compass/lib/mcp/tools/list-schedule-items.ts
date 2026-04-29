import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scheduleItems } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = new Set(["planned", "done", "cancelled"]);

export const listScheduleItemsTool: McpTool = {
  name: "compass.list_schedule_items",
  description: "List schedule items in a date range. Optional status filter.",
  async execute(params) {
    const fromDate = params.fromDate ? String(params.fromDate).trim() : "";
    const toDate = params.toDate ? String(params.toDate).trim() : "";

    if (fromDate && !DATE_PATTERN.test(fromDate)) {
      throw new Error("fromDate must be YYYY-MM-DD");
    }
    if (toDate && !DATE_PATTERN.test(toDate)) {
      throw new Error("toDate must be YYYY-MM-DD");
    }

    const status = params.status ? String(params.status).trim() : "";
    if (status && !STATUSES.has(status)) {
      throw new Error("status must be planned/done/cancelled");
    }

    const conditions = [
      fromDate ? gte(scheduleItems.date, fromDate) : undefined,
      toDate ? lte(scheduleItems.date, toDate) : undefined,
      status ? eq(scheduleItems.status, status) : undefined,
    ].filter(Boolean) as ReturnType<typeof eq>[];

    const rows = await db
      .select()
      .from(scheduleItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(scheduleItems.date), asc(scheduleItems.startTime));

    return { ok: true, items: rows };
  },
};

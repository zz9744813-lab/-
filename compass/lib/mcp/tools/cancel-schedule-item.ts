import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { scheduleItems } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const cancelScheduleItemTool: McpTool = {
  name: "compass.cancel_schedule_item",
  description:
    "Soft-cancel a schedule item (sets status to 'cancelled'). The row is kept for history.",
  async execute(params) {
    const id = String(params.id ?? "").trim();
    if (!id) throw new Error("id is required");

    const result = await db
      .update(scheduleItems)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(scheduleItems.id, id));

    return { ok: true, cancelled: result.changes ?? 0 };
  },
};

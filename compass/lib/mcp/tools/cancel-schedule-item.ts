import { cancelScheduleItem } from "@/lib/actions/schedule";
import type { McpTool } from "@/lib/mcp/tools/types";

export const cancelScheduleItemTool: McpTool = {
  name: "compass.cancel_schedule_item",
  description:
    "Soft-cancel a schedule item (sets status to 'cancelled'). The row is kept for history.",
  async execute(params) {
    const id = String(params.id ?? "").trim();
    if (!id) throw new Error("id is required");

    const reason = String(params.reason ?? "Hermes cancelled");
    await cancelScheduleItem(id, { reason });

    return { ok: true, cancelled: 1 };
  },
};

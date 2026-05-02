import { db } from "@/lib/db/client";
import { goals, goalEvents } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const createGoalTool: McpTool = {
  name: "compass.create_goal",
  description:
    "Create a goal extracted from chat or uploaded files. Progress is evidence-driven, do not set progress or status=completed.",
  async execute(params) {
    const title = String(params.title ?? "").trim();
    if (!title) throw new Error("title is required");

    const description = (() => {
      const raw = params.description;
      if (raw === undefined || raw === null) return null;
      const text = String(raw).trim();
      return text || null;
    })();

    const dimension = (() => {
      const raw = params.dimension;
      if (raw === undefined || raw === null) return "成长";
      const text = String(raw).trim();
      return text || "成长";
    })();

    const targetDateRaw = params.targetDate ? String(params.targetDate).trim() : "";
    const targetDate = targetDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(targetDateRaw) ? new Date(targetDateRaw) : null;

    // Always create as active, progress is evidence-driven
    const status = "active";

    const inserted = await db
      .insert(goals)
      .values({ title, description, dimension, targetDate, status, progress: 0 })
      .returning({ id: goals.id });

    const goalId = inserted[0]?.id;
    if (goalId) {
      await db.insert(goalEvents).values({
        goalId,
        type: "created",
        toStatus: "active",
        note: "Created via Hermes",
      });
    }

    return { ok: true, id: goalId };
  },
};

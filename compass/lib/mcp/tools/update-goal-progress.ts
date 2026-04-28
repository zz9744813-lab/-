import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const updateGoalProgressTool: McpTool = {
  name: "compass.update_goal_progress",
  description: "Increment or set progress for a goal.",
  async execute(params) {
    const goalId = String(params.goalId ?? "");
    if (!goalId) throw new Error("goalId is required");

    const delta = Number(params.delta ?? 0);
    const progress = params.progress as number | undefined;

    await db
      .update(goals)
      .set(
        progress === undefined
          ? {
              progress: sql`${goals.progress} + ${delta}`,
              updatedAt: new Date(),
            }
          : {
              progress,
              updatedAt: new Date(),
            },
      )
      .where(eq(goals.id, goalId));

    return { ok: true };
  },
};

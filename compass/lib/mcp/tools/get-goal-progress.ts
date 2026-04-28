import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const getGoalProgressTool: McpTool = {
  name: "compass.list_goals",
  description: "List active goals and progress values.",
  async execute() {
    return db.select().from(goals).where(eq(goals.status, "active"));
  },
};

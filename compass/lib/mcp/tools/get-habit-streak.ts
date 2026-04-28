import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habits } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const getHabitStreakTool: McpTool = {
  name: "compass.list_habits",
  description: "List active habits.",
  async execute() {
    return db.select().from(habits).where(eq(habits.status, "active"));
  },
};

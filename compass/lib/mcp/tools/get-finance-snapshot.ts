import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { financeSnapshots } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const getFinanceSnapshotTool: McpTool = {
  name: "compass.get_finance_snapshot",
  description: "Return the latest finance snapshot.",
  async execute() {
    const rows = await db.select().from(financeSnapshots).orderBy(desc(financeSnapshots.date)).limit(1);
    return rows[0] ?? null;
  },
};

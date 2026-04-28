import { and, desc, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const getCapturesTool: McpTool = {
  name: "compass.get_recent_captures",
  description: "Return recent capture records, optionally filtered by date range.",
  async execute(params) {
    const limit = Number(params.limit ?? 20);
    const startDate = params.startDate as string | undefined;
    const endDate = params.endDate as string | undefined;

    const filters = [];
    if (startDate) filters.push(gte(captures.createdAt, new Date(startDate)));
    if (endDate) filters.push(lte(captures.createdAt, new Date(endDate)));

    return db
      .select()
      .from(captures)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(captures.createdAt))
      .limit(limit);
  },
};

import { and, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const queryJournalTool: McpTool = {
  name: "compass.query_journal",
  description: "Query journal entries by date range and optional mood.",
  async execute(params) {
    const startDate = String(params.startDate ?? "");
    const endDate = String(params.endDate ?? "");
    const mood = params.mood ? Number(params.mood) : undefined;

    const filters = [];
    if (startDate) filters.push(gte(journalEntries.date, startDate));
    if (endDate) filters.push(lte(journalEntries.date, endDate));
    if (mood !== undefined) filters.push(gte(journalEntries.mood, mood));

    return db.select().from(journalEntries).where(filters.length ? and(...filters) : undefined);
  },
};

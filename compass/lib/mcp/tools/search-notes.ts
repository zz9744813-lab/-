import { like, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notes } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const searchNotesTool: McpTool = {
  name: "compass.search_notes",
  description: "Search note title/content with keyword matching.",
  async execute(params) {
    const q = String(params.query ?? "").trim();
    if (!q) return [];
    const pattern = `%${q}%`;

    return db
      .select()
      .from(notes)
      .where(or(like(notes.title, pattern), like(notes.content, pattern)))
      .limit(20);
  },
};

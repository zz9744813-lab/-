import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const updateJournalEntryTool: McpTool = {
  name: "compass.update_journal_entry",
  description: "Update fields on an existing journal entry.",
  async execute(params) {
    const id = String(params.id ?? "").trim();
    if (!id) throw new Error("id is required");

    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (params.title !== undefined) {
      const text = String(params.title).trim();
      patch.title = text || null;
    }
    if (params.content !== undefined) {
      const text = String(params.content).trim();
      if (!text) throw new Error("content cannot be empty");
      patch.content = text;
    }
    if (params.date !== undefined) {
      const value = String(params.date).trim();
      if (!DATE_RE.test(value)) throw new Error("date must be YYYY-MM-DD");
      patch.date = value;
    }
    if (params.mood !== undefined) {
      if (params.mood === null) {
        patch.mood = null;
      } else {
        const value = Number(params.mood);
        if (!Number.isFinite(value)) throw new Error("mood must be 1-5 or null");
        const rounded = Math.round(value);
        patch.mood = rounded >= 1 && rounded <= 5 ? rounded : null;
      }
    }
    if (params.tags !== undefined) {
      if (Array.isArray(params.tags)) {
        patch.tags = params.tags.map((t) => String(t).trim()).filter(Boolean).join(",") || null;
      } else {
        patch.tags = String(params.tags).trim() || null;
      }
    }

    const result = await db.update(journalEntries).set(patch).where(eq(journalEntries.id, id));
    return { ok: true, updated: result.changes ?? 0 };
  },
};

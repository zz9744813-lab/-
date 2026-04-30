import { db } from "@/lib/db/client";
import { journalEntries } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const createJournalEntryTool: McpTool = {
  name: "compass.create_journal_entry",
  description:
    "Persist a journal entry derived from chat or uploaded content. Hermes does the writing; Compass just stores.",
  async execute(params) {
    const content = String(params.content ?? "").trim();
    if (!content) throw new Error("content is required");

    const title = (() => {
      const raw = params.title;
      if (!raw) return null;
      const text = String(raw).trim();
      return text || null;
    })();

    const dateRaw = params.date ? String(params.date).trim() : "";
    const date = dateRaw && DATE_RE.test(dateRaw) ? dateRaw : new Date().toISOString().slice(0, 10);

    const mood = (() => {
      if (params.mood === undefined || params.mood === null) return null;
      const value = Number(params.mood);
      if (!Number.isFinite(value)) return null;
      const rounded = Math.round(value);
      return rounded >= 1 && rounded <= 5 ? rounded : null;
    })();

    const tags = (() => {
      if (Array.isArray(params.tags)) {
        return params.tags.map((t) => String(t).trim()).filter(Boolean).join(",") || null;
      }
      if (typeof params.tags === "string") {
        return params.tags.trim() || null;
      }
      return null;
    })();

    const inserted = await db
      .insert(journalEntries)
      .values({ title, content, date, mood, tags })
      .returning({ id: journalEntries.id });

    return { ok: true, id: inserted[0]?.id };
  },
};

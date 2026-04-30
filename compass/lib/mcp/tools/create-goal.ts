import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const STATUSES = new Set(["active", "completed", "paused"]);

export const createGoalTool: McpTool = {
  name: "compass.create_goal",
  description:
    "Create a goal extracted from chat or uploaded files. Compass only persists; Hermes decides what counts as a goal.",
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

    const status = (() => {
      const raw = params.status;
      if (!raw) return "active";
      const text = String(raw).trim();
      return STATUSES.has(text) ? text : "active";
    })();

    const inserted = await db
      .insert(goals)
      .values({ title, description, dimension, targetDate, status, progress: 0 })
      .returning({ id: goals.id });

    return { ok: true, id: inserted[0]?.id };
  },
};

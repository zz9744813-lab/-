import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { goals } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const STATUSES = new Set(["active", "completed", "paused"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const updateGoalTool: McpTool = {
  name: "compass.update_goal",
  description: "Update arbitrary goal fields (title/description/dimension/status/targetDate/progress).",
  async execute(params) {
    const id = String(params.id ?? "").trim();
    if (!id) throw new Error("id is required");

    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (params.title !== undefined) {
      const title = String(params.title).trim();
      if (!title) throw new Error("title cannot be empty");
      patch.title = title;
    }
    if (params.description !== undefined) {
      const text = String(params.description).trim();
      patch.description = text || null;
    }
    if (params.dimension !== undefined) {
      patch.dimension = String(params.dimension).trim() || "成长";
    }
    if (params.status !== undefined) {
      const value = String(params.status).trim();
      if (!STATUSES.has(value)) throw new Error("status must be active/completed/paused");
      patch.status = value;
    }
    if (params.targetDate !== undefined) {
      const raw = String(params.targetDate).trim();
      if (raw && !DATE_RE.test(raw)) throw new Error("targetDate must be YYYY-MM-DD");
      patch.targetDate = raw ? new Date(raw) : null;
    }
    if (params.progress !== undefined) {
      const progress = Number(params.progress);
      if (!Number.isFinite(progress)) throw new Error("progress must be a number");
      patch.progress = Math.max(0, Math.min(100, Math.round(progress)));
    }

    const result = await db.update(goals).set(patch).where(eq(goals.id, id));
    return { ok: true, updated: result.changes ?? 0 };
  },
};

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { goals, goalEvents } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const EDITABLE_STATUSES = new Set(["active", "paused"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const updateGoalTool: McpTool = {
  name: "compass.update_goal",
  description: "Update goal fields. Progress is evidence-driven and cannot be set directly. Status cannot be changed to completed (use completeGoal instead).",
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
      if (value === "completed") {
        throw new Error("Cannot set status to completed directly. Use completeGoal action with finalNote.");
      }
      if (!EDITABLE_STATUSES.has(value)) throw new Error("status can only be changed to active or paused");
      patch.status = value;
    }
    if (params.targetDate !== undefined) {
      const raw = String(params.targetDate).trim();
      if (raw && !DATE_RE.test(raw)) throw new Error("targetDate must be YYYY-MM-DD");
      patch.targetDate = raw ? new Date(raw) : null;
    }
    // Progress is evidence-driven, not directly settable
    if (params.progress !== undefined) {
      throw new Error("Goal progress is evidence-driven and cannot be set directly. Complete related schedule items or finance records instead.");
    }

    const result = await db.update(goals).set(patch).where(eq(goals.id, id));

    // Log status change event
    if (patch.status && result.changes) {
      const [goal] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
      if (goal) {
        await db.insert(goalEvents).values({
          goalId: id,
          type: "status_changed",
          fromStatus: goal.status,
          toStatus: String(patch.status),
          note: "Updated via Hermes",
        });
      }
    }

    return { ok: true, updated: result.changes ?? 0 };
  },
};

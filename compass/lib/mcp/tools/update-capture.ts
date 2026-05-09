import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

const VALID_STATUSES = new Set(["inbox", "completed", "archived"]);

export const updateCaptureTool: McpTool = {
  name: "compass.update_capture",
  description:
    "Update a capture record's status (inbox → completed/archived) or dimension.",
  async execute(params) {
    const id = String(params.id ?? "").trim();
    if (!id) throw new Error("id is required");

    const status = params.status ? String(params.status).trim() : null;
    if (status && !VALID_STATUSES.has(status)) {
      throw new Error(`status must be one of: ${[...VALID_STATUSES].join(", ")}`);
    }

    const dimension = params.dimension ? String(params.dimension).trim() : null;

    const values: Record<string, unknown> = {};
    if (status) values.status = status;
    if (dimension) values.dimension = dimension;

    if (Object.keys(values).length === 0) {
      throw new Error("at least one of status or dimension is required");
    }

    const result = await db.update(captures).set(values).where(eq(captures.id, id)).returning({ id: captures.id });
    if (result.length === 0) throw new Error(`Capture not found: ${id}`);
    return { ok: true, id };
  },
};
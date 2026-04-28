import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const createCaptureTool: McpTool = {
  name: "compass.create_capture",
  description: "Create a new capture record.",
  async execute(params) {
    const rawText = String(params.rawText ?? "").trim();
    if (!rawText) {
      throw new Error("rawText is required");
    }

    const source = String(params.source ?? "capture");
    const dimension = params.dimension ? String(params.dimension) : null;

    await db.insert(captures).values({ rawText, source, dimension });
    return { ok: true };
  },
};

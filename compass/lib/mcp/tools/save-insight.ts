import { db } from "@/lib/db/client";
import { insights } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const saveInsightTool: McpTool = {
  name: "compass.save_insight",
  description: "Persist a new Hermes insight into Compass.",
  async execute(params) {
    const category = String(params.category ?? "pattern");
    const title = String(params.title ?? "").trim();
    const body = String(params.body ?? "").trim();

    if (!title || !body) {
      throw new Error("title and body are required");
    }

    await db.insert(insights).values({
      category,
      title,
      body,
      evidence: params.evidence ? JSON.stringify(params.evidence) : null,
      confidence: typeof params.confidence === "number" ? params.confidence : null,
    });

    return { ok: true };
  },
};

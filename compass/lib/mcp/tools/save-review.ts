import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

export const saveReviewTool: McpTool = {
  name: "compass.save_review",
  description: "Persist a generated review markdown.",
  async execute(params) {
    const period = String(params.period ?? "week");
    const title = String(params.title ?? `${period} review`);
    const body = String(params.body ?? "");
    if (!body.trim()) throw new Error("body is required");

    await db.insert(reviews).values({ period, title, body, source: "hermes" });
    return { ok: true };
  },
};

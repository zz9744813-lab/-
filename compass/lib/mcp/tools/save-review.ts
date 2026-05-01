import { db } from "@/lib/db/client";
import { reviewMemories, reviews } from "@/lib/db/schema";
import type { McpTool } from "@/lib/mcp/tools/types";

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function stringifyOptionalJson(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export const saveReviewTool: McpTool = {
  name: "compass.save_review",
  description: "Persist a generated review and its long-term memory metrics.",
  async execute(params) {
    const period = String(params.period ?? "week");
    const title = String(params.title ?? `${period} review`);
    const body = String(params.body ?? "");
    if (!body.trim()) throw new Error("body is required");

    const startDate = optionalString(params.startDate);
    const endDate = optionalString(params.endDate);
    const sourceId = optionalString(params.sourceId ?? params.sourceScheduleId);
    const metricsJson = stringifyOptionalJson(params.metrics);
    const dimensionsJson = stringifyOptionalJson(params.dimensions);
    const summary = optionalString(params.summary) ?? body.slice(0, 800);

    const inserted = await db
      .insert(reviews)
      .values({ period, title, body, startDate, endDate, source: "hermes" })
      .returning({ id: reviews.id });
    const reviewId = inserted[0]?.id;

    await db.insert(reviewMemories).values({
      period,
      startDate,
      endDate,
      title,
      summary,
      metricsJson,
      dimensionsJson,
      source: "hermes",
      sourceId: sourceId ?? reviewId,
    });

    return { ok: true, id: reviewId };
  },
};

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { japanIntelItems, japanSources } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const archived = searchParams.get("archived");
  const majorOnly = searchParams.get("major");
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const conditions = [];
  if (archived === "true") {
    conditions.push(eq(japanIntelItems.isArchived, true));
  } else if (archived !== "all") {
    conditions.push(eq(japanIntelItems.isArchived, false));
  }
  if (majorOnly === "true") {
    conditions.push(eq(japanIntelItems.isMajorUpdate, true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select({
      id: japanIntelItems.id,
      sourceId: japanIntelItems.sourceId,
      title: japanIntelItems.title,
      url: japanIntelItems.url,
      publishedAt: japanIntelItems.publishedAt,
      fetchedAt: japanIntelItems.fetchedAt,
      category: japanIntelItems.category,
      language: japanIntelItems.language,
      summaryZh: japanIntelItems.summaryZh,
      impactLevel: japanIntelItems.impactLevel,
      relevanceScore: japanIntelItems.relevanceScore,
      isMajorUpdate: japanIntelItems.isMajorUpdate,
      isArchived: japanIntelItems.isArchived,
      createdAt: japanIntelItems.createdAt,
      sourceName: japanSources.name,
      sourceAuthorityLevel: japanSources.authorityLevel,
    })
    .from(japanIntelItems)
    .leftJoin(japanSources, eq(japanIntelItems.sourceId, japanSources.id))
    .where(where)
    .orderBy(desc(japanIntelItems.isMajorUpdate), desc(japanIntelItems.createdAt))
    .limit(limit);

  // Filter by category in JS since it's in the items table
  const filtered = category ? items.filter((i) => i.category.includes(category)) : items;

  return NextResponse.json({ items: filtered });
}

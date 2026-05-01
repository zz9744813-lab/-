import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { japanIntelItems, japanSources } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

const CATEGORY_MAP: Record<string, string[]> = {
  visa: ["visa", "visa-policy", "visa-cn", "consular", "work-labor", "policy"],
  study: ["study", "education-policy", "exam"],
  jobs: ["jobs", "business-jobs", "tech-jobs", "company-jobs", "industry"],
};

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

  // Category filter using mapped categories
  const mappedCategories = category ? CATEGORY_MAP[category] : undefined;
  if (mappedCategories && mappedCategories.length > 0) {
    conditions.push(inArray(japanIntelItems.category, mappedCategories));
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

  return NextResponse.json({ items });
}

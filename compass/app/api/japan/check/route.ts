import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { japanSources, japanIntelItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchFromSource } from "@/lib/japan/fetchers";
import { summarizeJapanIntelItem } from "@/lib/japan/summarizer";
import { requireCronAuth } from "@/lib/server/cron-auth";

export async function POST(req: NextRequest) {
  const authError = requireCronAuth(req);
  if (authError) return authError;

  const results: { sourceId: string; fetched: number; new: number; error?: string }[] = [];

  const sources = await db.select().from(japanSources).where(eq(japanSources.enabled, true));

  for (const source of sources) {
    try {
      const items = await fetchFromSource(source);

      let newCount = 0;
      for (const item of items) {
        // Check for duplicate by contentHash
        const existing = await db
          .select()
          .from(japanIntelItems)
          .where(eq(japanIntelItems.contentHash, item.contentHash))
          .limit(1);

        if (existing.length > 0) continue;

        const summaryZh = summarizeJapanIntelItem({
          title: item.title,
          rawText: item.rawText,
          category: item.category,
          impactLevel: item.impactLevel,
          isMajorUpdate: item.isMajorUpdate,
          url: item.url,
        });

        await db.insert(japanIntelItems).values({
          sourceId: item.sourceId,
          title: item.title,
          url: item.url,
          publishedAt: item.publishedAt,
          category: item.category,
          language: item.language,
          rawText: item.rawText,
          contentHash: item.contentHash,
          impactLevel: item.impactLevel,
          isMajorUpdate: item.isMajorUpdate,
          summaryZh,
        });
        newCount++;
      }

      await db
        .update(japanSources)
        .set({ lastCheckedAt: new Date(), lastSuccessAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(japanSources.id, source.id));

      results.push({ sourceId: source.id, fetched: items.length, new: newCount });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await db
        .update(japanSources)
        .set({ lastCheckedAt: new Date(), lastError: error, updatedAt: new Date() })
        .where(eq(japanSources.id, source.id));

      results.push({ sourceId: source.id, fetched: 0, new: 0, error });
    }
  }

  const totalNew = results.reduce((sum, r) => sum + r.new, 0);
  const errors = results.filter((r) => r.error).length;

  return NextResponse.json({
    ok: true,
    totalSources: sources.length,
    totalNew,
    errors,
    results,
  });
}

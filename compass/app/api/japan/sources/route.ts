import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { japanSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ALL_JAPAN_SOURCES } from "@/lib/japan/sources";
import { requireCronAuth } from "@/lib/server/cron-auth";

export async function GET() {
  const sources = await db.select().from(japanSources).orderBy(japanSources.category);
  return NextResponse.json({ sources });
}

// Seed sources from whitelist
export async function POST(req: NextRequest) {
  const authError = requireCronAuth(req);
  if (authError) return authError;

  let seeded = 0;
  for (const src of ALL_JAPAN_SOURCES) {
    const existing = await db.select().from(japanSources).where(eq(japanSources.id, src.id)).limit(1);
    if (existing.length > 0) continue;

    await db.insert(japanSources).values({
      id: src.id,
      name: src.name,
      url: src.url,
      category: src.category,
      authorityLevel: src.authorityLevel,
    });
    seeded++;
  }

  const totalSources = await db.select().from(japanSources);
  return NextResponse.json({ ok: true, seeded, totalSources: totalSources.length });
}

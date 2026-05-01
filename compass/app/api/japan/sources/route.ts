import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { japanSources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ALL_JAPAN_SOURCES } from "@/lib/japan/sources";

export async function GET() {
  const sources = await db.select().from(japanSources).orderBy(japanSources.category);
  return NextResponse.json({ sources });
}

// Seed sources from whitelist
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({ ok: true, seeded });
}

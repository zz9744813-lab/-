/**
 * GET /api/operations/recent?since=<unix_ms>
 *
 * Returns brain_actions created after the given timestamp.
 * Used by the chat panel to show tool-call badges after a message.
 *
 * [T-61] Phase 6
 */

import { db } from "@/lib/db/client";
import { brainActions } from "@/lib/db/schema";
import { gte, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const since = Number(url.searchParams.get("since") ?? "0");
  if (!since) return NextResponse.json({ actions: [] });

  const actions = await db
    .select()
    .from(brainActions)
    .where(gte(brainActions.createdAt, new Date(since)))
    .orderBy(desc(brainActions.createdAt))
    .limit(20);

  return NextResponse.json({ actions });
}

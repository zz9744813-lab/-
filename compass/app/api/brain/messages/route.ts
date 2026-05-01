import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hermesMessages } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseToolCall(value: string | null): { attachments?: unknown[]; compassActions?: unknown[]; provider?: string; ok?: boolean } {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? 30);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.round(limitRaw))) : 30;

  const rows = await db.select().from(hermesMessages).orderBy(desc(hermesMessages.createdAt)).limit(limit);
  const messages = rows
    .slice()
    .reverse()
    .map((row) => {
      const tc = parseToolCall(row.toolCall);
      return {
        id: row.id,
        role: row.role === "user" ? "user" : "assistant",
        content: row.content,
        createdAt: formatDateTime(row.createdAt),
        attachments: Array.isArray(tc.attachments) ? tc.attachments : [],
        compassActions: Array.isArray(tc.compassActions) ? tc.compassActions : [],
        provider: tc.provider ?? null,
        bridgeOk: tc.ok ?? null,
      };
    });

  return NextResponse.json({ ok: true, messages });
}

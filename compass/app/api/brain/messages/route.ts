import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { hermesMessages } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function attachmentsFromToolCall(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as { attachments?: unknown };
    return Array.isArray(parsed.attachments) ? parsed.attachments : [];
  } catch {
    return [];
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
    .map((row) => ({
      id: row.id,
      role: row.role === "user" ? "user" : "assistant",
      content: row.content,
      createdAt: formatDateTime(row.createdAt),
      attachments: attachmentsFromToolCall(row.toolCall),
    }));

  return NextResponse.json({ ok: true, messages });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { captures } from "@/lib/db/schema";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; source?: string };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  await db.insert(captures).values({
    rawText: body.text.trim(),
    source: body.source ?? "web",
  });

  return NextResponse.json({ ok: true });
}

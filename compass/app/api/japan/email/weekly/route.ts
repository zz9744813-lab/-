import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyDigest } from "@/lib/japan/digest";
import { sendJapanIntelEmail } from "@/lib/japan/email";
import { db } from "@/lib/db/client";
import { japanIntelDigests } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const toEmail = process.env.COMPASS_INTEL_EMAIL_TO;
  if (!toEmail) {
    return NextResponse.json({ error: "COMPASS_INTEL_EMAIL_TO not set" }, { status: 400 });
  }

  // Calculate last week's date range
  const now = new Date();
  const periodEnd = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodStart = weekAgo.toISOString().slice(0, 10);

  const digest = await generateWeeklyDigest(periodStart, periodEnd);

  const emailResult = await sendJapanIntelEmail({
    kind: "weekly_digest",
    toEmail,
    subject: digest.title,
    bodyMarkdown: digest.bodyMarkdown,
  });

  // Save digest record
  await db.insert(japanIntelDigests).values({
    periodStart,
    periodEnd,
    title: digest.title,
    bodyMarkdown: digest.bodyMarkdown,
    itemIdsJson: JSON.stringify(digest.itemIds),
    sentAt: emailResult.success ? new Date() : null,
  });

  return NextResponse.json({
    ok: emailResult.success,
    error: emailResult.error,
    period: { start: periodStart, end: periodEnd },
    itemCount: digest.itemIds.length,
  });
}

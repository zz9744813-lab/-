import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { japanIntelItems, japanIntelAlerts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateMajorAlertMarkdown } from "@/lib/japan/digest";
import { sendJapanIntelEmail } from "@/lib/japan/email";
import { requireCronAuth } from "@/lib/server/cron-auth";

export async function POST(req: NextRequest) {
  const authError = requireCronAuth(req);
  if (authError) return authError;

  const toEmail = process.env.COMPASS_INTEL_EMAIL_TO;
  if (!toEmail) {
    return NextResponse.json({ error: "COMPASS_INTEL_EMAIL_TO not set" }, { status: 400 });
  }

  // Find unalerted major updates
  const majorItems = await db
    .select()
    .from(japanIntelItems)
    .where(eq(japanIntelItems.isMajorUpdate, true));

  const alerts = await db.select().from(japanIntelAlerts);
  const alertedItemIds = new Set(alerts.map((a) => a.itemId));

  const unalerted = majorItems.filter((i) => !alertedItemIds.has(i.id));

  if (unalerted.length === 0) {
    return NextResponse.json({ ok: true, message: "No new major updates to alert" });
  }

  const results = [];
  for (const item of unalerted) {
    const bodyMarkdown = generateMajorAlertMarkdown({
      title: item.title,
      url: item.url,
      summaryZh: item.summaryZh,
      impactLevel: item.impactLevel,
    });

    const emailResult = await sendJapanIntelEmail({
      kind: "major_alert",
      toEmail,
      subject: `[Compass 日本情报][重大更新] ${item.title}`,
      bodyMarkdown,
    });

    await db.insert(japanIntelAlerts).values({
      itemId: item.id,
      reason: `Major update detected: ${item.title}`,
      severity: item.impactLevel,
      sentAt: emailResult.success ? new Date() : null,
    });

    results.push({ itemId: item.id, title: item.title, sent: emailResult.success });
  }

  return NextResponse.json({ ok: true, alerted: results.length, results });
}

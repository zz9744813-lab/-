import { runAutoDelayEngine } from "./auto-delay";
import { runWeeklyReflection } from "./reflection-generator";
import { db } from "@/lib/db/client";
import { coachEvents } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

async function processPendingCoachEvents() {
  const pendingEvents = await db
    .select()
    .from(coachEvents)
    .where(
      and(
        eq(coachEvents.acknowledgedByUser, false),
        isNull(coachEvents.emailSentAt),
      ),
    );

  if (pendingEvents.length === 0) return;

  const userEmail = process.env.COMPASS_REMINDER_EMAIL;
  if (!userEmail) {
    console.log("No COMPASS_REMINDER_EMAIL configured, skipping coach event email.");
    return;
  }

  const toEmail = pendingEvents.filter(
    (e) => e.severity === "warning" || e.severity === "critical",
  );
  if (toEmail.length === 0) return;

  const body = toEmail
    .map((e) => `[${e.severity.toUpperCase()}] ${e.type}\n${e.payloadJson ?? ""}`)
    .join("\n\n");

  console.log(`Mock: Sending email to ${userEmail}:\n${body}`);

  for (const e of toEmail) {
    await db
      .update(coachEvents)
      .set({ emailSentAt: new Date() })
      .where(eq(coachEvents.id, e.id));
  }
}

async function runAllCrons() {
  console.log("Starting Compass v2 cron job...");
  
  try {
    const delayedCount = await runAutoDelayEngine();
    console.log(`Auto delay engine executed. Delayed ${delayedCount} items.`);
  } catch(e) {
    console.error("Auto delay error:", e);
  }

  try {
    const now = new Date();
    const dow = now.getDay();
    const hour = now.getHours();
    if (dow === 0 && hour === 20) {
      const reviewCount = await runWeeklyReflection();
      console.log(`Weekly reflection executed. Generated ${reviewCount} review.`);
    } else {
      console.log(`[cron] Skipping weekly reflection (current dow=${dow}, hour=${hour}; runs Sun 20:00 only).`);
    }
  } catch(e) {
    console.error("Weekly reflection error:", e);
  }

  try {
    await processPendingCoachEvents();
    console.log("Coach events processed.");
  } catch(e) {
    console.error("Coach events error:", e);
  }

  console.log("Cron job finished.");
}

if (require.main === module) {
  runAllCrons().then(() => process.exit(0)).catch((e) => {
    console.error("Cron failed:", e);
    process.exit(1);
  });
}
